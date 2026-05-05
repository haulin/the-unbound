import {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
  ENABLE_ANIMATIONS,
  GOAL_NARRATIVE,
  INITIAL_ARMY_SIZE,
  INITIAL_FOOD,
  INITIAL_GOLD,
  MAP_HINT_MESSAGE,
  MOVE_SLIDE_FRAMES,
  FOOD_COST_DEFAULT,
} from './constants'
import { gameOverMessage } from './gameOver'
import { SPRITES } from './spriteIds'
import { generateWorld } from './world'
import { onEnterDefaultTerrain } from './mechanics/onEnter'
import { applyEnterAnims } from './mechanics/encounterHelpers'
import { MECHANIC_INDEX } from './mechanics'
import type { TileEnterResult } from './mechanics/types'
import {
  LEFT_PANEL_KIND_AUTO,
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
  type Action,
  type Anim,
  type LeftPanel,
  type Resources,
  type State,
  type Ui,
  type Cell,
  type RunPathStep,
  type Vec2,
} from './types'
import { enqueueAnim, enqueueDeltas, enqueueGridTransition } from './uiAnim'
import { resourcesWithClampedFoodIfNeeded } from './foodCarry'

const { onEnterTileByKind } = MECHANIC_INDEX
const { enterFoodCostByKind } = MECHANIC_INDEX
const { reduceEncounterActionByEncounterKind } = MECHANIC_INDEX


function tickClock(ui: Ui): Ui {
  return {
    message: ui.message,
    leftPanel: ui.leftPanel,
    clock: { frame: ui.clock.frame + 1 },
    anim: ui.anim,
  }
}

function pruneExpiredAnims(ui: Ui): Ui {
  const frame = ui.clock.frame
  const active = ui.anim.active
  const kept: Anim[] = []

  for (let i = 0; i < active.length; i++) {
    const a = active[i]!
    const startFrame = a.startFrame
    const durationFrames = a.durationFrames
    const endFrame = startFrame + Math.max(0, durationFrames)
    if (frame < endFrame) kept.push(a)
  }

  if (kept.length === active.length) return ui
  return {
    message: ui.message,
    leftPanel: ui.leftPanel,
    clock: ui.clock,
    anim: { nextId: ui.anim.nextId, active: kept },
  }
}

export function hasBlockingAnim(ui: Ui): boolean {
  const active = ui.anim.active
  for (let i = 0; i < active.length; i++) {
    if (active[i]!.blocksInput) return true
  }
  return false
}

function clearSpriteFocusIfAny(ui: Ui): LeftPanel {
  if (ui.leftPanel.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO }
  return ui.leftPanel
}

function initialMessageForStart(): string {
  // Always start with the goal narrative only (no auto-appended signpost clue).
  return GOAL_NARRATIVE
}

function reduceGoal(s: State): State {
  const prevUi = s.ui
  const prevLeftPanel = prevUi.leftPanel
  const nextLeftPanel: LeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP
      ? prevLeftPanel
      : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPRITES.buttons.goal }
  return {
    world: s.world,
    player: s.player,
    run: s.run,
    resources: s.resources,
    encounter: s.encounter,
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: GOAL_NARRATIVE,
      leftPanel: nextLeftPanel,
    },
  }
}

function reduceToggleMinimap(s: State): State {
  const prevUi = s.ui
  const prevLeftPanel = prevUi.leftPanel

  if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
    const nextMessage = prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: nextMessage,
        leftPanel: { kind: LEFT_PANEL_KIND_MINIMAP },
      },
    }
  }

  const nextLeftPanel: LeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? { kind: LEFT_PANEL_KIND_AUTO } : { kind: LEFT_PANEL_KIND_MINIMAP }
  return {
    world: s.world,
    player: s.player,
    run: s.run,
    resources: s.resources,
    encounter: s.encounter,
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: prevUi.message,
      leftPanel: nextLeftPanel,
    },
  }
}

function reduceToggleMap(s: State): State {
  const prevUi = s.ui
  const prevLeftPanel = prevUi.leftPanel

  // Close: restore prior panel + message (unless overwritten).
  if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
    const restoreMessage = prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: restoreMessage,
        leftPanel: prevLeftPanel.restoreLeftPanel,
      },
    }
  }

  return {
    world: s.world,
    player: s.player,
    run: s.run,
    resources: s.resources,
    encounter: s.encounter,
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: MAP_HINT_MESSAGE,
      leftPanel: { kind: LEFT_PANEL_KIND_MAP, restoreLeftPanel: prevLeftPanel, restoreMessage: prevUi.message },
    },
  }
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
  const cost = enterFoodCostByKind[cell.kind] ?? FOOD_COST_DEFAULT

  const foodDeltas: number[] = []
  const armyDeltas: number[] = []
  let food: number
  let armySize: number
  if (prevFood >= cost) {
    food = prevFood - cost
    foodDeltas.push(-cost)
    armySize = prevRes.armySize
  } else {
    food = 0
    if (prevFood > 0) foodDeltas.push(-prevFood)
    armySize = prevRes.armySize - 1
    armyDeltas.push(-1)
  }

  const baseResources: Resources = { ...prevRes, food, armySize }

  // If the food cost killed the player, skip the tile handler entirely. The mechanic's side
  // effects (cell mutations, RNG advances, would-be encounters, would-be wins) are all
  // suppressed: the player died walking onto the tile, they didn't really "use" it. The
  // game-over message is set below; nothing else from the tile is observable to the player.
  const wouldGameOver = baseResources.armySize <= 0
  const ctx = { cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources }
  const outcome: TileEnterResult = wouldGameOver
    ? {}
    : (onEnterTileByKind[cell.kind] ?? onEnterDefaultTerrain)(ctx)

  const nextWorld = outcome.world ?? world
  const nextResources = resourcesWithClampedFoodIfNeeded(outcome.resources ?? baseResources)
  // Popup the *applied* food delta after carry-cap clamping (prevents +N popups when only +k fits).
  const appliedFoodDelta = nextResources.food - baseResources.food
  if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta)
  const nextHasWon = prevState.run.hasWon || !!outcome.hasWon

  // wouldGameOver implies isGameOver (handler skipped, so resources unchanged from baseResources).
  // A handler MAY upgrade isGameOver (e.g. combat actions reducing armySize), but that runs in
  // reduceEncounterAction, not here.
  const isGameOver = nextResources.armySize <= 0

  const nextEncounter = outcome.encounter ?? null
  const teleported = outcome.teleportTo != null
  const landingPos = teleported ? outcome.teleportTo! : nextPos
  const finalKnowsPosition = teleported ? false : (prevState.run.knowsPosition || !!outcome.knowsPosition)
  const message = isGameOver
    ? gameOverMessage(nextWorld.seed, nextStepCount)
    : (outcome.message ?? onEnterDefaultTerrain(ctx).message)

  const prevUi = prevState.ui
  const baseUi: Ui = {
    message,
    leftPanel: clearSpriteFocusIfAny(prevUi),
    clock: prevUi.clock,
    anim: prevUi.anim,
  }

  const mem = updateRunPathMemoryAfterMove({
    prevPath: prevState.run.path,
    prevLostBufferStartIndex: prevState.run.lostBufferStartIndex,
    nextPos: landingPos,
    nextKnowsPosition: finalKnowsPosition,
    teleported,
  })

  const baseState: State = {
    world: nextWorld,
    player: { position: landingPos },
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
    ui: baseUi,
  }

  if (!ENABLE_ANIMATIONS) return baseState

  const startFrame = baseUi.clock.frame
  let uiWith = baseState.ui
  uiWith = enqueueDeltas(uiWith, { target: 'food', deltas: foodDeltas, startFrame })
  uiWith = enqueueDeltas(uiWith, { target: 'army', deltas: armyDeltas, startFrame })

  // Mechanic-supplied enter-anims (e.g. grid transitions into an encounter) play AFTER the
  // move-slide reveal completes.
  if (outcome.enterAnims && outcome.enterAnims.length) {
    uiWith = applyEnterAnims(uiWith, outcome.enterAnims, startFrame + MOVE_SLIDE_FRAMES)
  }

  // Teleport flashes 'blank' → 'overworld' instead of sliding (the player doesn't walk there).
  if (teleported) {
    uiWith = enqueueGridTransition(uiWith, { startFrame, from: 'blank', to: 'overworld' })
  } else {
    uiWith = enqueueAnim(uiWith, {
      kind: 'moveSlide',
      startFrame,
      durationFrames: MOVE_SLIDE_FRAMES,
      blocksInput: true,
      params: { fromPos: { x: prevPos.x, y: prevPos.y }, toPos: { x: nextPos.x, y: nextPos.y }, dx, dy },
    })
  }

  return { ...baseState, ui: uiWith }
}

function updateRunPathMemoryAfterMove(args: {
  prevPath: RunPathStep[] | null | undefined
  prevLostBufferStartIndex: number | null | undefined
  nextPos: Vec2
  nextKnowsPosition: boolean
  teleported: boolean
}): { path: RunPathStep[]; lostBufferStartIndex: number | null } {
  const prevPath = args.prevPath ?? []
  let path = prevPath.concat([{ pos: args.nextPos, isMapped: false }])
  let lostBufferStartIndex = args.prevLostBufferStartIndex ?? null

  if (args.teleported) {
    lostBufferStartIndex = path.length - 1
  }

  if (!args.nextKnowsPosition && lostBufferStartIndex == null) {
    lostBufferStartIndex = path.length - 1
  }

  if (args.nextKnowsPosition) {
    if (lostBufferStartIndex != null) {
      const start = Math.max(0, Math.min(lostBufferStartIndex, path.length - 1))
      const mapped = path.slice()
      for (let i = start; i < mapped.length; i++) {
        const step = mapped[i]!
        if (step.isMapped) continue
        mapped[i] = { pos: step.pos, isMapped: true }
      }
      path = mapped
      lostBufferStartIndex = null
    } else {
      const idx = path.length - 1
      const step = path[idx]!
      if (!step.isMapped) {
        const mapped = path.slice()
        mapped[idx] = { pos: step.pos, isMapped: true }
        path = mapped
      }
    }
  }

  return { path, lostBufferStartIndex }
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

    const hasWon = false

    const baseUi: Ui = {
      message: initialMessageForStart(),
      leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
      clock: { frame: 0 },
      anim: { nextId: 1, active: [] },
    }

    const ui = ENABLE_ANIMATIONS
      ? enqueueGridTransition(baseUi, { startFrame: 0, from: 'blank', to: 'overworld' })
      : baseUi

    return {
      world,
      player: { position: { x: playerPos.x, y: playerPos.y } },
      run: {
        stepCount: 0,
        hasWon,
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
        hasBronzeKey: false,
        hasScout: false,
        hasTameBeast: false,
      },
      encounter: null,
      ui,
    }
  }

  if (prevState == null) return null

  // Global allowlist: actions that always work regardless of encounter state.
  // Order: TICK first because it's the highest-frequency action (one per frame).
  if (action.type === ACTION_TICK) return reduceTick(prevState)
  if (action.type === ACTION_RESTART) return reduceRestart(prevState)
  if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState)
  if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState)
  if (action.type === ACTION_TOGGLE_MAP) return reduceToggleMap(prevState)

  // Encounter dispatch: per-encounter mechanic owns its own action handlers. Skipped on
  // game-over / win so handlers can assume an alive, in-progress run. Returns null when
  // the handler doesn't claim this action (fall through to the move/no-op branches below).
  if (prevState.encounter && !prevState.run.isGameOver && !prevState.run.hasWon) {
    const handler = reduceEncounterActionByEncounterKind[prevState.encounter.kind]
    if (handler) {
      const next = handler(prevState, action)
      if (next != null) return next
    }
  }

  if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx, action.dy)
  return prevState
}

function reduceTick(prevState: State): State {
  const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(prevState.ui)) : prevState.ui
  return { ...prevState, ui: tickedUi }
}

