import {
  ACTION_FIGHT,
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RETURN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
  COMBAT_ENCOUNTER_LINES,
  COMBAT_FLEE_EXIT_LINES,
  COMBAT_FOOD_BONUS_MAX,
  COMBAT_GOLD_REWARD_MAX,
  COMBAT_GOLD_REWARD_MIN,
  COMBAT_VICTORY_EXIT_LINES,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  GAME_OVER_LINES,
  GOAL_NARRATIVE,
  HENGE_COOLDOWN_MOVES,
  HENGE_ENCOUNTER_LINE,
  INITIAL_ARMY_SIZE,
  INITIAL_FOOD,
  INITIAL_GOLD,
  LOST_FLAVOR_LINES,
  MAP_HINT_MESSAGE,
  MOVE_SLIDE_FRAMES,
  FOOD_COST_DEFAULT,
} from './constants'
import { SPRITES } from './spriteIds'
import { reduceCampAction } from './camp'
import { cellIdForPos, resolveFightRound, spawnEnemyArmy } from './combat'
import { reduceFarmAction } from './farmEncounter'
import { reduceLocksmithAction } from './locksmithEncounter'
import { reduceTownAction } from './town'
import { rollMoveEvent } from './mechanics/moveEvents'
import { pickTeleportDestination } from './teleport'
import { RNG } from './rng'
import { generateWorld } from './world'
import { setCellAt } from './cells'
import { getOnEnterHandler } from './mechanics/onEnter'
import { MECHANIC_INDEX } from './mechanics'
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
  type Encounter,
  type HengeCell,
  type RunPathStep,
  type Vec2,
  type World,
} from './types'
import { enqueueAnim, enqueueGridTransition } from './uiAnim'
import { resourcesWithClampedFoodIfNeeded } from './foodCarry'

const { startEncounterByKind } = MECHANIC_INDEX
const { enterFoodCostByKind } = MECHANIC_INDEX

export function getLeftPanel(ui: Ui): LeftPanel {
  return ui.leftPanel
}

export function getUi(ui: Ui): Ui {
  return ui
}

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
  const lp = getLeftPanel(ui)
  if (lp.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO }
  return lp
}

function normalizeResources(_world: World, raw: Resources | null | undefined): Resources {
  if (!raw)
    return {
      food: INITIAL_FOOD,
      gold: INITIAL_GOLD,
      armySize: INITIAL_ARMY_SIZE,
      hasBronzeKey: false,
      hasScout: false,
      hasTameBeast: false,
    }
  return {
    food: raw.food,
    gold: raw.gold ?? 0,
    armySize: raw.armySize,
    hasBronzeKey: !!raw.hasBronzeKey,
    hasScout: !!raw.hasScout,
    hasTameBeast: !!raw.hasTameBeast,
  }
}

function gameOverMessage(seed: number, stepCount: number): string {
  const k = Math.trunc(seed) + Math.trunc(stepCount)
  const m = GAME_OVER_LINES.length
  const idx = ((k % m) + m) % m
  return GAME_OVER_LINES[idx] || ''
}

function initialMessageForStart(): string {
  // Always start with the goal narrative only (no auto-appended signpost clue).
  return GOAL_NARRATIVE
}

function reduceGoal(s: State): State {
  const prevUi = getUi(s.ui)
  const prevLeftPanel = getLeftPanel(prevUi)
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
  const prevUi = getUi(s.ui)
  const prevLeftPanel = getLeftPanel(prevUi)

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
  const prevUi = getUi(s.ui)
  const prevLeftPanel = getLeftPanel(prevUi)

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

  const prevRes = normalizeResources(world, prevState.resources)
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

  const handler = getOnEnterHandler(cell.kind)
  const outcome = handler({ cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources })

  let nextWorld = outcome.world || world
  const rawOutcomeResources = outcome.resources || baseResources
  let nextResources = resourcesWithClampedFoodIfNeeded(rawOutcomeResources)
  // Reflect the *applied* food delta after any carry-cap clamping (prevents +N popups when only +k fits).
  if (rawOutcomeResources.food !== baseResources.food || (outcome.foodDeltas && outcome.foodDeltas.length)) {
    const applied = nextResources.food - baseResources.food
    if (applied) foodDeltas.push(applied)
  }
  if (outcome.armyDeltas && outcome.armyDeltas.length) armyDeltas.push(...outcome.armyDeltas)
  const nextHasWon = prevState.run.hasWon || !!outcome.hasWon
  const nextKnowsPosition = prevState.run.knowsPosition || !!outcome.knowsPosition

  const isGameOver = nextResources.armySize <= 0
  let message = outcome.message
  if (isGameOver) {
    message = gameOverMessage(nextWorld.seed, nextStepCount)
  }

  let nextEncounter: Encounter | null = prevState.encounter
  let didStartCombat = false
  let didStartCamp = false
  let didStartTown = false
  let didStartFarm = false
  let didStartLocksmith = false
  let teleported = false
  let landingPos = nextPos
  if (!isGameOver && !prevState.encounter) {
    const destCell = nextWorld.cells[nextPos.y]![nextPos.x]!
    const destKind = destCell.kind
    const destCellId = cellIdForPos(nextWorld, nextPos)

    // Capture the tile message before we override it with encounter flavor (we want to restore this on victory/return).
    const preEncounterMessage = message

    const starter = startEncounterByKind[destKind]
    if (starter) {
      nextEncounter = starter({ kind: destKind, cellId: destCellId, restoreMessage: preEncounterMessage })
      if (destKind === 'locksmith' && nextResources.hasBronzeKey) {
        nextEncounter = null
      } else {
        didStartCamp = nextEncounter!.kind === 'camp'
        didStartTown = nextEncounter!.kind === 'town'
        didStartFarm = nextEncounter!.kind === 'farm'
        didStartLocksmith = nextEncounter!.kind === 'locksmith'
      }
    } else {
      const event = rollMoveEvent({
        seed: nextWorld.seed,
        stepCount: nextStepCount,
        cellId: destCellId,
        cell: destCell,
        hasScout: !!nextResources.hasScout,
      })

      if (event && event.kind === 'fight') {
        const spawned = spawnEnemyArmy({ rngState: nextWorld.rngState, playerArmy: nextResources.armySize })
        nextWorld = { ...nextWorld, rngState: spawned.rngState }
        nextEncounter = {
          kind: 'combat',
          enemyArmySize: spawned.enemyArmy,
          sourceKind: destKind,
          sourceCellId: destCellId,
          restoreMessage: preEncounterMessage,
        }
        didStartCombat = true

        // Henge-specific cooldown lives on the henge cell itself.
        if (destKind === 'henge') {
          const hc = destCell as HengeCell
          const nextHenge: HengeCell = { ...hc, nextReadyStep: nextStepCount + HENGE_COOLDOWN_MOVES }
          nextWorld = setCellAt(nextWorld, nextPos, nextHenge)
        }

        // Override tile lore with encounter lore.
        message =
          destKind === 'henge'
            ? HENGE_ENCOUNTER_LINE
            : RNG.createTileRandom({ world: nextWorld, stepCount: nextStepCount, pos: nextPos }).perMoveLine(COMBAT_ENCOUNTER_LINES)
      }

      if (event && event.kind === 'lost') {
        const td = pickTeleportDestination({
          world: nextWorld,
          origin: nextPos,
          rngState: nextWorld.rngState,
        })
        nextWorld = { ...nextWorld, rngState: td.rngState }
        landingPos = td.destination
        message = RNG.createTileRandom({ world: nextWorld, stepCount: nextStepCount, pos: nextPos }).perMoveLine(LOST_FLAVOR_LINES)
        teleported = true
      }
    }
  }

  const prevUi = getUi(prevState.ui)
  const baseUi: Ui = {
    message,
    leftPanel: clearSpriteFocusIfAny(prevUi),
    clock: prevUi.clock,
    anim: prevUi.anim,
  }

  const finalPlayerPos = teleported ? landingPos : nextPos
  const finalKnowsPosition = teleported ? false : nextKnowsPosition

  const mem = updateRunPathMemoryAfterMove({
    prevPath: prevState.run.path,
    prevLostBufferStartIndex: prevState.run.lostBufferStartIndex,
    nextPos: finalPlayerPos,
    nextKnowsPosition: finalKnowsPosition,
    teleported,
  })

  const baseState: State = {
    world: nextWorld,
    player: { position: finalPlayerPos },
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
  for (let i = 0; i < foodDeltas.length; i++) {
    const delta = foodDeltas[i]!
    if (!delta) continue
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'food', delta },
    })
  }
  for (let i = 0; i < armyDeltas.length; i++) {
    const delta = armyDeltas[i]!
    if (!delta) continue
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'army', delta },
    })
  }

  if (didStartCombat) {
    const revealStart = startFrame + MOVE_SLIDE_FRAMES
    uiWith = enqueueGridTransition(uiWith, { startFrame: revealStart, from: 'overworld', to: 'combat' })
  }
  if (didStartCamp) {
    const revealStart = startFrame + MOVE_SLIDE_FRAMES
    uiWith = enqueueGridTransition(uiWith, { startFrame: revealStart, from: 'overworld', to: 'camp' })
  }
  if (didStartTown) {
    const revealStart = startFrame + MOVE_SLIDE_FRAMES
    uiWith = enqueueGridTransition(uiWith, { startFrame: revealStart, from: 'overworld', to: 'town' })
  }
  if (didStartFarm) {
    const revealStart = startFrame + MOVE_SLIDE_FRAMES
    uiWith = enqueueGridTransition(uiWith, { startFrame: revealStart, from: 'overworld', to: 'farm' })
  }
  if (didStartLocksmith) {
    const revealStart = startFrame + MOVE_SLIDE_FRAMES
    uiWith = enqueueGridTransition(uiWith, { startFrame: revealStart, from: 'overworld', to: 'locksmith' })
  }
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

  return {
    world: baseState.world,
    player: baseState.player,
    run: baseState.run,
    resources: baseState.resources,
    encounter: baseState.encounter,
    ui: uiWith,
  }
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

  if (action.type === ACTION_RESTART) return reduceRestart(prevState)
  if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState)
  if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState)
  if (action.type === ACTION_TOGGLE_MAP) {
    return reduceToggleMap(prevState)
  }

  const campHandled = reduceCampAction(prevState, action)
  if (campHandled) return campHandled

  const farmHandled = reduceFarmAction(prevState, action)
  if (farmHandled) return farmHandled

  const locksmithHandled = reduceLocksmithAction(prevState, action)
  if (locksmithHandled) return locksmithHandled

  const townHandled = reduceTownAction(prevState, action)
  if (townHandled) return townHandled

  if (action.type === ACTION_RETURN) {
    if (!prevState.encounter) return prevState
    if (prevState.encounter.kind !== 'combat') return prevState
    const prevUi = getUi(prevState.ui)
    if (prevState.run.isGameOver || prevState.run.hasWon) return prevState

    const prevRes = normalizeResources(prevState.world, prevState.resources)
    const nextArmy = prevRes.armySize - 1
    const isGameOver = nextArmy <= 0
    const nextResources: Resources = { ...prevRes, armySize: Math.max(0, nextArmy) }
    const fleePick = isGameOver ? null : RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.flee', COMBAT_FLEE_EXIT_LINES)
    const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : fleePick!.nextState.run
    const nextMessage = isGameOver ? gameOverMessage(prevState.world.seed, prevState.run.stepCount) : fleePick!.line || prevUi.message
    const baseUi: Ui = { ...prevUi, message: nextMessage }
    if (!ENABLE_ANIMATIONS) {
      return {
        world: prevState.world,
        player: prevState.player,
        run: nextRun,
        resources: nextResources,
        encounter: null,
        ui: baseUi,
      }
    }

    const startFrame = baseUi.clock.frame
    let uiWith = baseUi
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'army', delta: -1 },
    })
    return {
      world: prevState.world,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: null,
      ui: isGameOver
        ? uiWith
        : enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' }),
    }
  }
  if (action.type === ACTION_FIGHT) {
    if (prevState.run.isGameOver || prevState.run.hasWon) return prevState
    const enc = prevState.encounter
    if (!enc || enc.kind !== 'combat') return prevState

    const prevEnemy = enc.enemyArmySize
    if (prevEnemy <= 0) {
      return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, encounter: null, ui: prevState.ui }
    }

    const prevRes = normalizeResources(prevState.world, prevState.resources)
    const prevUi = getUi(prevState.ui)

    const round = resolveFightRound({
      rngState: prevState.world.rngState,
      playerArmy: prevRes.armySize,
      enemyArmy: prevEnemy,
    })

    const foodDeltas: number[] = []
    const goldDeltas: number[] = []
    const armyDeltas: number[] = []
    const enemyDeltas: number[] = []

    let nextResources = prevRes
    let nextEncounter: Encounter | null = enc

    if (round.outcome === 'playerHit') {
      const nextEnemy = round.nextEnemyArmy
      const killed = round.killed
      if (killed) enemyDeltas.push(-killed)

      nextEncounter = nextEnemy <= 0 ? null : { ...enc, enemyArmySize: nextEnemy }
    } else {
      nextResources = { ...nextResources, armySize: nextResources.armySize - 1 }
      armyDeltas.push(-1)
    }

    let nextWorld = { ...prevState.world, rngState: round.rngState }

    // Combat reward is paid once, at the end, when the enemy is eliminated.
    if (round.outcome === 'playerHit' && nextEncounter == null && !prevState.run.isGameOver && !prevState.run.hasWon) {
      const goldSpan = COMBAT_GOLD_REWARD_MAX - COMBAT_GOLD_REWARD_MIN + 1
      const sr = RNG.createStreamRandom(nextWorld.rngState)
      const gold = COMBAT_GOLD_REWARD_MIN + sr.intExclusive(goldSpan)
      nextResources = { ...nextResources, gold: nextResources.gold + gold }
      goldDeltas.push(gold)

      const foodBonus = sr.intExclusive(COMBAT_FOOD_BONUS_MAX + 1)
      if (foodBonus) {
        nextResources = { ...nextResources, food: nextResources.food + foodBonus }
      }
      nextWorld = { ...nextWorld, rngState: sr.rngState }
    }
    nextResources = resourcesWithClampedFoodIfNeeded(nextResources)
    const appliedFoodDelta = nextResources.food - prevRes.food
    if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta)
    const isGameOver = nextResources.armySize <= 0
    const victoryPick =
      !isGameOver && nextEncounter == null ? RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.victory', COMBAT_VICTORY_EXIT_LINES) : null
    const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : nextEncounter == null ? victoryPick!.nextState.run : prevState.run
    const nextMessage = isGameOver
      ? gameOverMessage(nextWorld.seed, prevState.run.stepCount)
      : nextEncounter == null
        ? victoryPick!.line || prevUi.message
        : prevUi.message

    const baseUi: Ui = { message: nextMessage, leftPanel: prevUi.leftPanel, clock: prevUi.clock, anim: prevUi.anim }
    if (!ENABLE_ANIMATIONS) {
      return {
        world: nextWorld,
        player: prevState.player,
        run: nextRun,
        resources: nextResources,
        encounter: isGameOver ? null : nextEncounter,
        ui: baseUi,
      }
    }

    const startFrame = baseUi.clock.frame
    let uiWith = baseUi
    for (let i = 0; i < foodDeltas.length; i++) {
      const delta = foodDeltas[i]!
      if (!delta) continue
      uiWith = enqueueAnim(uiWith, {
        kind: 'delta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: 'food', delta },
      })
    }
    for (let i = 0; i < goldDeltas.length; i++) {
      const delta = goldDeltas[i]!
      if (!delta) continue
      uiWith = enqueueAnim(uiWith, {
        kind: 'delta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: 'gold', delta },
      })
    }
    for (let i = 0; i < armyDeltas.length; i++) {
      const delta = armyDeltas[i]!
      if (!delta) continue
      uiWith = enqueueAnim(uiWith, {
        kind: 'delta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: 'army', delta },
      })
    }
    for (let i = 0; i < enemyDeltas.length; i++) {
      const delta = enemyDeltas[i]!
      if (!delta) continue
      uiWith = enqueueAnim(uiWith, {
        kind: 'delta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: 'enemyArmy', delta },
      })
    }

    if (!isGameOver && nextEncounter == null) {
      uiWith = enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' })
    }

    return {
      world: nextWorld,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: isGameOver ? null : nextEncounter,
      ui: uiWith,
    }
  }
  if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx, action.dy)

  if (action.type === ACTION_TICK) {
    const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(getUi(prevState.ui))) : getUi(prevState.ui)
    return {
      world: prevState.world,
      player: prevState.player,
      run: prevState.run,
      resources: prevState.resources,
      encounter: prevState.encounter,
      ui: tickedUi,
    }
  }

  return prevState
}

