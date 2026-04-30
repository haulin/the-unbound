import {
  ACTION_FIGHT,
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RETURN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MINIMAP,
  COMBAT_REWARD_MAX,
  COMBAT_REWARD_MIN,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  GAME_OVER_LINES,
  GOAL_NARRATIVE,
  GRID_TRANSITION_STEP_FRAMES,
  HENGE_COOLDOWN_MOVES,
  HENGE_ENCOUNTER_LINE,
  INITIAL_ARMY_SIZE,
  INITIAL_FOOD,
  LOST_FLAVOR_LINES,
  MOVE_SLIDE_FRAMES,
  SPR_BUTTON_GOAL,
  enterFoodCostForKind,
} from './constants'
import { cellIdForPos, pickCombatEncounterLine, pickCombatExitLine, resolveFightRound, spawnEnemyArmy } from './combat'
import { rollTileEvent } from './tileEvents'
import { pickTeleportDestination } from './teleport'
import { pickDeterministicLine } from './tiles/poiUtils'
import { generateWorld } from './world'
import { setCellAt } from './cells'
import { randInt } from './prng'
import { getOnEnterHandler } from './tiles/registry'
import {
  LEFT_PANEL_KIND_AUTO,
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
  type World,
} from './types'

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

function gridTransitionDurationFrames(): number {
  return Math.max(1, Math.trunc(GRID_TRANSITION_STEP_FRAMES)) * 5
}

function enqueueAnim(ui: Ui, anim: Omit<Anim, 'id'>): Ui {
  const id = Math.max(1, Math.trunc(ui.anim.nextId))
  const a = { id, ...anim } as Anim
  const nextActive = ui.anim.active.concat([a])
  return {
    message: ui.message,
    leftPanel: ui.leftPanel,
    clock: ui.clock,
    anim: { nextId: id + 1, active: nextActive },
  }
}

function clearSpriteFocusIfAny(ui: Ui): LeftPanel {
  const lp = getLeftPanel(ui)
  if (lp.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO }
  return lp
}

function normalizeResources(_world: World, raw: Resources | null | undefined): Resources {
  if (!raw) return { food: INITIAL_FOOD, armySize: INITIAL_ARMY_SIZE, hasBronzeKey: false }
  return { food: raw.food, armySize: raw.armySize, hasBronzeKey: !!raw.hasBronzeKey }
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
      : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPR_BUTTON_GOAL }
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

function reduceMove(prevState: State, dx: number, dy: number): State {
  if (prevState.run.isGameOver || prevState.run.hasWon) return prevState
  if (prevState.encounter && prevState.encounter.kind === 'combat') return prevState

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
  const cost = enterFoodCostForKind(cell.kind)

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
  let nextResources = outcome.resources || baseResources
  if (outcome.foodDeltas && outcome.foodDeltas.length) foodDeltas.push(...outcome.foodDeltas)
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
  let teleported = false
  let landingPos = nextPos
  if (!isGameOver && !prevState.encounter) {
    const destCell = nextWorld.cells[nextPos.y]![nextPos.x]!
    const destKind = destCell.kind
    const destCellId = cellIdForPos(nextWorld, nextPos)

    let hengeReady = true
    if (destKind === 'henge') {
      const hc = destCell as HengeCell
      const readyAt = hc.nextReadyStep ?? 0
      hengeReady = nextStepCount >= readyAt
    }

    const event = rollTileEvent({
      seed: nextWorld.seed,
      stepCount: nextStepCount,
      cellId: destCellId,
      kind: destKind,
      hengeReady,
    })

    // Capture the tile message before we override it with encounter flavor (we want to restore this on victory/return).
    const preEncounterMessage = message

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
          : pickCombatEncounterLine({ seed: nextWorld.seed, stepCount: nextStepCount, cellId: destCellId })
    }

    if (event && event.kind === 'lost') {
      const td = pickTeleportDestination({
        world: nextWorld,
        origin: nextPos,
        rngState: nextWorld.rngState,
      })
      nextWorld = { ...nextWorld, rngState: td.rngState }
      landingPos = td.destination
      message = pickDeterministicLine(LOST_FLAVOR_LINES, nextWorld.seed, destCellId, nextStepCount)
      teleported = true
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

  const baseState: State = {
    world: nextWorld,
    player: { position: finalPlayerPos },
    run: {
      stepCount: nextStepCount,
      hasWon: nextHasWon,
      isGameOver,
      knowsPosition: finalKnowsPosition,
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
      kind: 'foodDelta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { delta },
    })
  }
  for (let i = 0; i < armyDeltas.length; i++) {
    const delta = armyDeltas[i]!
    if (!delta) continue
    uiWith = enqueueAnim(uiWith, {
      kind: 'armyDelta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { delta },
    })
  }

  if (didStartCombat) {
    const revealStart = startFrame + MOVE_SLIDE_FRAMES
    uiWith = enqueueAnim(uiWith, {
      kind: 'gridTransition',
      startFrame: revealStart,
      durationFrames: gridTransitionDurationFrames(),
      blocksInput: true,
      params: { from: 'overworld', to: 'combat' },
    })
  }
  if (teleported) {
    uiWith = enqueueAnim(uiWith, {
      kind: 'gridTransition',
      startFrame,
      durationFrames: gridTransitionDurationFrames(),
      blocksInput: true,
      params: { from: 'blank', to: 'overworld' },
    })
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
      ? enqueueAnim(baseUi, {
          kind: 'gridTransition',
          startFrame: 0,
          durationFrames: gridTransitionDurationFrames(),
          blocksInput: true,
          params: { from: 'blank', to: 'overworld' },
        })
      : baseUi

    return {
      world,
      player: { position: { x: playerPos.x, y: playerPos.y } },
      run: { stepCount: 0, hasWon, isGameOver: false, knowsPosition: false },
      resources: {
        food: INITIAL_FOOD,
        armySize: INITIAL_ARMY_SIZE,
        hasBronzeKey: false,
      },
      encounter: null,
      ui,
    }
  }

  if (prevState == null) return null

  if (action.type === ACTION_RESTART) return reduceRestart(prevState)
  if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState)
  if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState)
  if (action.type === ACTION_RETURN) {
    if (!prevState.encounter) return prevState
    const prevUi = getUi(prevState.ui)
    if (prevState.run.isGameOver || prevState.run.hasWon) return prevState

    // Returning from combat costs 1 troop
    const prevRes = normalizeResources(prevState.world, prevState.resources)
    const nextArmy = prevRes.armySize - 1
    const isGameOver = nextArmy <= 0
    const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : prevState.run
    const nextResources: Resources = { ...prevRes, armySize: Math.max(0, nextArmy) }
    const nextMessage = isGameOver
      ? gameOverMessage(prevState.world.seed, prevState.run.stepCount)
      : pickCombatExitLine({
          seed: prevState.world.seed,
          stepCount: prevState.run.stepCount,
          cellId: prevState.encounter.sourceCellId,
          outcome: 'flee',
        }) || prevUi.message
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
      kind: 'armyDelta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { delta: -1 },
    })
    return {
      world: prevState.world,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: null,
      ui: isGameOver
        ? uiWith
        : enqueueAnim(uiWith, {
            kind: 'gridTransition',
            startFrame,
            durationFrames: gridTransitionDurationFrames(),
            blocksInput: true,
            params: { from: 'combat', to: 'overworld' },
          }),
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
      const span = COMBAT_REWARD_MAX - COMBAT_REWARD_MIN + 1
      const r = randInt(nextWorld.rngState, span)
      nextWorld = { ...nextWorld, rngState: r.rngState }
      const reward = COMBAT_REWARD_MIN + r.value
      nextResources = { ...nextResources, food: nextResources.food + reward }
      foodDeltas.push(reward)
    }
    const isGameOver = nextResources.armySize <= 0
    const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : prevState.run
    const nextMessage = isGameOver
      ? gameOverMessage(nextWorld.seed, prevState.run.stepCount)
      : nextEncounter == null
        ? pickCombatExitLine({
            seed: nextWorld.seed,
            stepCount: prevState.run.stepCount,
            cellId: enc.sourceCellId,
            outcome: 'victory',
          }) || prevUi.message
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
        kind: 'foodDelta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { delta },
      })
    }
    for (let i = 0; i < armyDeltas.length; i++) {
      const delta = armyDeltas[i]!
      if (!delta) continue
      uiWith = enqueueAnim(uiWith, {
        kind: 'armyDelta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { delta },
      })
    }
    for (let i = 0; i < enemyDeltas.length; i++) {
      const delta = enemyDeltas[i]!
      if (!delta) continue
      uiWith = enqueueAnim(uiWith, {
        kind: 'enemyArmyDelta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { delta },
      })
    }

    if (!isGameOver && nextEncounter == null) {
      uiWith = enqueueAnim(uiWith, {
        kind: 'gridTransition',
        startFrame,
        durationFrames: gridTransitionDurationFrames(),
        blocksInput: true,
        params: { from: 'combat', to: 'overworld' },
      })
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

