import {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
  GOAL_NARRATIVE,
  INITIAL_ARMY_SIZE,
  INITIAL_FOOD,
  INITIAL_GOLD,
  MAP_HINT_MESSAGE,
  FOOD_COST_DEFAULT,
} from './constants'
import { gameOverMessage, applyArmyZeroGameOver } from './gameOver'
import { SPRITES } from './spriteIds'
import { generateWorld } from './world'
import { onEnterDefaultTerrain } from './mechanics/encounterHelpers'
import { MECHANIC_INDEX } from './mechanics'
import type { TileEnterResult } from './mechanics/types'
import {
  LEFT_PANEL_KIND_AUTO,
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
  type Action,
  type DeltaAnimTarget,
  type DomainEvent,
  type Encounter,
  type LeftPanel,
  type Player,
  type Resources,
  type Run,
  type State,
  type Ui,
  type Cell,
  type World,
} from './types'
import { applyFoodCapOnGain } from './foodCarry'
import { updateRunPathMemoryAfterMove } from './gameMap'

// MECHANIC_INDEX is read lazily through `MECHANIC_INDEX.foo[...]` accessors
// inside function bodies. Reading at module top-level (e.g.
// `const { onEnterTileByKind } = MECHANIC_INDEX`) would crash under circular
// imports because the index isn't built yet when reducer.ts first evaluates.

// Central state transition primitive. Mechanics return `Change` (or
// `Change[]` for multi-beat); the dispatcher applies them via `commit` /
// `applyChanges`. Resource-diff events are auto-derived from the post-clamp
// `resources` (callers pass the final value, not deltas); explicit events
// from `change.events` are appended after.

export type Change = {
  world?: World
  resources?: Resources
  run?: Run
  encounter?: Encounter | null
  player?: Player
  message?: string
  leftPanel?: LeftPanel
  // Explicit events the caller wants to emit (e.g. positionChanged,
  // encounterOpened). Auto-derived resource events come first, then these in
  // order. Mechanics never insert `phaseBoundary` here — the dispatcher does
  // that between Changes in a `Change[]`.
  events?: readonly DomainEvent[]
}

export function commit(state: State, change: Change): State {
  const nextResources = change.resources ?? state.resources
  const nextWorld = change.world ?? state.world
  const nextRun = change.run ?? state.run
  const nextEncounter = change.encounter !== undefined ? change.encounter : state.encounter
  const nextPlayer = change.player ?? state.player
  const nextMessage = change.message ?? state.ui.message
  const nextLeftPanel = change.leftPanel ?? state.ui.leftPanel

  const newEvents: DomainEvent[] = []
  if (change.resources !== undefined) {
    appendResourceDiffEvents(newEvents, state.resources, nextResources)
  }
  if (change.events) {
    for (let i = 0; i < change.events.length; i++) newEvents.push(change.events[i]!)
  }

  return {
    world: nextWorld,
    player: nextPlayer,
    run: nextRun,
    resources: nextResources,
    encounter: nextEncounter,
    ui: { message: nextMessage, leftPanel: nextLeftPanel },
    pendingEvents:
      newEvents.length === 0 ? state.pendingEvents : [...state.pendingEvents, ...newEvents],
  }
}

// Append one `resourceChanged` event per non-zero per-target delta.
// Mechanics that need the cost and gain shown as separate popups split them
// across beats of a `Change[]` rather than emitting explicit events here.
function appendResourceDiffEvents(
  out: DomainEvent[],
  prev: Resources,
  next: Resources,
): void {
  pushIfDelta(out, 'food', next.food - prev.food)
  pushIfDelta(out, 'gold', next.gold - prev.gold)
  pushIfDelta(out, 'army', next.armySize - prev.armySize)
}

function pushIfDelta(out: DomainEvent[], target: DeltaAnimTarget, delta: number): void {
  if (delta) out.push({ kind: 'resourceChanged', target, delta })
}

// Apply a sequence of Changes with implicit `phaseBoundary` events between
// beats. Each Change is one logical "beat" of the action; events within a
// beat may run concurrently per the translator's policy, beats wait for the
// prior beat's blocking work.
export function applyChanges(state: State, changes: readonly Change[]): State {
  let next = state
  for (let i = 0; i < changes.length; i++) {
    if (i > 0) {
      next = { ...next, pendingEvents: [...next.pendingEvents, { kind: 'phaseBoundary' }] }
    }
    next = commit(next, changes[i]!)
  }
  return next
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clearSpriteFocusIfAny(ui: Ui): LeftPanel {
  if (ui.leftPanel.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO }
  return ui.leftPanel
}

function initialMessageForStart(): string {
  // Always start with the goal narrative only (no auto-appended signpost clue).
  return GOAL_NARRATIVE
}

function reduceGoal(s: State): State {
  const prevLeftPanel = s.ui.leftPanel
  const nextLeftPanel: LeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP
      ? prevLeftPanel
      : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPRITES.actions.goal }
  return commit(s, { message: GOAL_NARRATIVE, leftPanel: nextLeftPanel })
}

function reduceToggleMinimap(s: State): State {
  const prevUi = s.ui
  const prevLeftPanel = prevUi.leftPanel

  if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
    const nextMessage =
      prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message
    return commit(s, {
      message: nextMessage,
      leftPanel: { kind: LEFT_PANEL_KIND_MINIMAP },
    })
  }

  const nextLeftPanel: LeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP
      ? { kind: LEFT_PANEL_KIND_AUTO }
      : { kind: LEFT_PANEL_KIND_MINIMAP }
  return commit(s, { leftPanel: nextLeftPanel })
}

function reduceToggleMap(s: State): State {
  const prevUi = s.ui
  const prevLeftPanel = prevUi.leftPanel

  if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
    const restoreMessage =
      prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message
    return commit(s, {
      message: restoreMessage,
      leftPanel: prevLeftPanel.restoreLeftPanel,
    })
  }

  return commit(s, {
    message: MAP_HINT_MESSAGE,
    leftPanel: {
      kind: LEFT_PANEL_KIND_MAP,
      restoreLeftPanel: prevLeftPanel,
      restoreMessage: prevUi.message,
    },
  })
}

function reduceMove(prevState: State, dx: number, dy: number): State {
  if (prevState.run.isGameOver || prevState.run.hasWon) return prevState
  if (prevState.encounter) return prevState

  const world = prevState.world
  const prevPos = prevState.player.position
  const nextPos = {
    x: (prevPos.x + dx + world.width) % world.width,
    y: (prevPos.y + dy + world.height) % world.height,
  }

  const cell: Cell = world.cells[nextPos.y]![nextPos.x]!
  const nextStepCount = prevState.run.stepCount + 1

  const prevRes = prevState.resources
  const prevFood = prevRes.food
  const cost = MECHANIC_INDEX.enterFoodCostByKind[cell.kind] ?? FOOD_COST_DEFAULT

  let food: number
  let armySize: number
  if (prevFood >= cost) {
    food = prevFood - cost
    armySize = prevRes.armySize
  } else {
    food = 0
    armySize = prevRes.armySize - 1
  }

  const baseResources: Resources = { ...prevRes, food, armySize }

  // If the food cost killed the player, skip the tile handler entirely. The
  // mechanic's side effects (cell mutations, RNG advances, would-be encounters,
  // would-be wins) are all suppressed: the player died walking onto the tile.
  const wouldGameOver = baseResources.armySize <= 0
  const ctx = { cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources }
  const outcome: TileEnterResult = wouldGameOver
    ? {}
    : (MECHANIC_INDEX.onEnterTileByKind[cell.kind] ?? onEnterDefaultTerrain)(ctx)

  const nextWorld = outcome.world ?? world
  const nextResources = applyFoodCapOnGain(baseResources, outcome.resources ?? baseResources)
  const nextHasWon = prevState.run.hasWon || !!outcome.hasWon

  const isGameOver = nextResources.armySize <= 0
  const nextEncounter = outcome.encounter ?? null
  const teleported = outcome.teleportTo != null
  const landingPos = teleported ? outcome.teleportTo! : nextPos
  const finalKnowsPosition = teleported
    ? false
    : (prevState.run.knowsPosition || !!outcome.knowsPosition)
  const message = isGameOver
    ? gameOverMessage(nextWorld.seed, nextStepCount)
    : (outcome.message ?? onEnterDefaultTerrain(ctx).message)

  const mem = updateRunPathMemoryAfterMove({
    prevPath: prevState.run.path,
    prevLostBufferStartIndex: prevState.run.lostBufferStartIndex,
    nextPos: landingPos,
    nextKnowsPosition: finalKnowsPosition,
    teleported,
  })

  // The slide / teleport-flash event is a position fact (not a resource
  // diff), so it needs explicit emission.
  const moveEvent: DomainEvent = teleported
    ? { kind: 'teleported', from: prevPos, to: landingPos }
    : { kind: 'positionChanged', from: prevPos, to: nextPos, dx, dy }

  // Three beats: cost diff → slide → tile arrival (gain diff + encounter
  // open). The cost popup is non-blocking, so it floats over the slide
  // rather than blocking it. `applyChanges` inserts implicit `phaseBoundary`
  // between beats so the slide (blocking) completes before the gain popup /
  // encounter-open transition. Splitting cost and arrival also keeps the
  // two food deltas as separate popups instead of collapsing into a single
  // net diff.
  const beats: Change[] = [
    { resources: baseResources },
    { player: { position: landingPos }, events: [moveEvent] },
    {
      world: nextWorld,
      run: {
        ...prevState.run,
        stepCount: nextStepCount,
        hasWon: nextHasWon,
        isGameOver,
        knowsPosition: finalKnowsPosition,
        path: mem.path,
        lostBufferStartIndex: mem.lostBufferStartIndex,
      },
      resources: nextResources,
      encounter: nextEncounter,
      message,
      leftPanel: clearSpriteFocusIfAny(prevState.ui),
      ...(nextEncounter && !isGameOver
        ? { events: [{ kind: 'encounterOpened', encounterKind: nextEncounter.kind }] }
        : {}),
    },
  ]

  return applyChanges(prevState, beats)
}

function reduceRestart(s: State): State {
  const next = processAction(null, { type: ACTION_NEW_RUN, seed: s.world.seed + 1 })
  return next || s
}

export function processAction(prevState: State | null, action: Action): State | null {
  if (prevState == null) {
    if (action.type !== ACTION_NEW_RUN) return null
  }

  if (action.type === ACTION_NEW_RUN) {
    const seed = Math.trunc(action.seed)
    const generated = generateWorld(seed)
    const world = generated.world
    const playerPos = generated.startPosition

    const ui: Ui = {
      message: initialMessageForStart(),
      leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
    }

    return {
      world,
      player: { position: { x: playerPos.x, y: playerPos.y } },
      run: {
        stepCount: 0,
        hasWon: false,
        isGameOver: false,
        knowsPosition: false,
        path: [],
        lostBufferStartIndex: null,
        copyCursors: {},
      },
      resources: {
        food: INITIAL_FOOD,
        gold: INITIAL_GOLD,
        armySize: INITIAL_ARMY_SIZE,
        inventory: [],
        party: [],
      },
      encounter: null,
      ui,
      pendingEvents: [{ kind: 'runStarted' }],
    }
  }

  if (prevState == null) return null

  // `pendingEvents` is per-action: each platform reads it from the returned
  // state and clears it on its own boundary. Reset here so every dispatch
  // starts with a clean event log.
  const stateBeforeDispatch: State =
    prevState.pendingEvents.length === 0
      ? prevState
      : { ...prevState, pendingEvents: [] }

  // Global allowlist: actions that always work regardless of encounter state.
  if (action.type === ACTION_RESTART) return reduceRestart(stateBeforeDispatch)
  if (action.type === ACTION_SHOW_GOAL) return reduceGoal(stateBeforeDispatch)
  if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(stateBeforeDispatch)
  if (action.type === ACTION_TOGGLE_MAP) return reduceToggleMap(stateBeforeDispatch)

  // Encounter dispatch: per-encounter mechanic owns its own action handlers.
  if (
    stateBeforeDispatch.encounter &&
    !stateBeforeDispatch.run.isGameOver &&
    !stateBeforeDispatch.run.hasWon
  ) {
    const handler =
      MECHANIC_INDEX.reduceEncounterActionByEncounterKind[stateBeforeDispatch.encounter.kind]
    if (handler) {
      const result = handler(stateBeforeDispatch, action)
      if (result != null) {
        return applyArmyZeroGameOver(applyEncounterResult(stateBeforeDispatch, result))
      }
    }
  }

  if (action.type === ACTION_MOVE) return reduceMove(stateBeforeDispatch, action.dx, action.dy)
  return stateBeforeDispatch
}

// A mechanic can return:
//   - `Change` (single beat) — apply via `commit`.
//   - `Change[]` (multi-beat) — apply via `applyChanges` (implicit
//     phaseBoundary between beats).
function applyEncounterResult(
  state: State,
  result: Change | readonly Change[],
): State {
  if (Array.isArray(result)) return applyChanges(state, result as readonly Change[])
  return commit(state, result as Change)
}
