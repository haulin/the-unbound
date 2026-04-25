import {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MINIMAP,
  CASTLE_FOUND_MESSAGE,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  FOOD_MOVE_COST,
  GOAL_NARRATIVE,
  INITIAL_FOOD,
  MOVE_SLIDE_FRAMES,
  SPR_BUTTON_GOAL,
  TILE_CASTLE,
  TILE_SIGNPOST,
} from './constants'
import { formatNearestPoiSignpostMessage } from './signpost'
import { generateWorld } from './world'
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
  type World,
} from './types'

export function getLeftPanel(ui: unknown): LeftPanel {
  if (!ui || typeof ui !== 'object') return { kind: LEFT_PANEL_KIND_AUTO }
  const root = ui as Record<string, unknown>
  const lp = root.leftPanel
  if (!lp || typeof lp !== 'object') return { kind: LEFT_PANEL_KIND_AUTO }
  const o = lp as Record<string, unknown>
  const kind = o.kind
  if (kind === LEFT_PANEL_KIND_AUTO) return { kind: LEFT_PANEL_KIND_AUTO }
  if (kind === LEFT_PANEL_KIND_MINIMAP) return { kind: LEFT_PANEL_KIND_MINIMAP }
  if (kind === LEFT_PANEL_KIND_SPRITE) {
    const spriteId = o.spriteId
    if (typeof spriteId === 'number') return { kind: LEFT_PANEL_KIND_SPRITE, spriteId: spriteId | 0 }
  }
  return { kind: LEFT_PANEL_KIND_AUTO }
}

export function getUi(ui: Ui | unknown): Ui {
  if (!ui || typeof ui !== 'object') {
    return {
      message: '',
      leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
      clock: { frame: 0 },
      anim: { nextId: 1, active: [] },
    }
  }

  const u = ui as Record<string, unknown>
  const message = typeof u.message === 'string' ? u.message : ''
  const leftPanel = getLeftPanel(u)

  const clockObj = u.clock && typeof u.clock === 'object' ? (u.clock as Record<string, unknown>) : null
  const clockFrame = clockObj && typeof clockObj.frame === 'number' ? (clockObj.frame | 0) : 0
  const clock = { frame: clockFrame }

  const animObj = u.anim && typeof u.anim === 'object' ? (u.anim as Record<string, unknown>) : null
  const active = animObj && Array.isArray(animObj.active) ? (animObj.active as Anim[]) : []
  const nextId = animObj && typeof animObj.nextId === 'number' ? (animObj.nextId | 0) : 1

  return {
    message,
    leftPanel,
    clock,
    anim: { nextId: nextId > 0 ? nextId : 1, active },
  }
}

function tickClock(ui: Ui): Ui {
  const u = getUi(ui)
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: { frame: (u.clock.frame | 0) + 1 },
    anim: u.anim,
  }
}

function pruneExpiredAnims(ui: Ui): Ui {
  const u = getUi(ui)
  const frame = u.clock.frame | 0
  const active = u.anim.active
  const kept: Anim[] = []

  for (let i = 0; i < active.length; i++) {
    const a = active[i]!
    const startFrame = a.startFrame | 0
    const durationFrames = a.durationFrames | 0
    const endFrame = startFrame + Math.max(0, durationFrames)
    if (frame < endFrame) kept.push(a)
  }

  if (kept.length === active.length) return u
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: u.clock,
    anim: { nextId: u.anim.nextId, active: kept },
  }
}

export function hasBlockingAnim(ui: Ui): boolean {
  const u = getUi(ui)
  const active = u.anim.active
  for (let i = 0; i < active.length; i++) {
    if (active[i]!.blocksInput) return true
  }
  return false
}

function enqueueAnim(ui: Ui, anim: Omit<Anim, 'id'>): Ui {
  const u = getUi(ui)
  const id = u.anim.nextId | 0
  const a = { id, ...anim } as Anim
  const nextActive = u.anim.active.concat([a])
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: u.clock,
    anim: { nextId: id + 1, active: nextActive },
  }
}

function clearSpriteFocusIfAny(ui: Ui): LeftPanel {
  const lp = getLeftPanel(ui)
  if (lp.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO }
  return lp
}

function initialMessageForStart(tileId: number, playerPos: { x: number; y: number }, world: World): string {
  let msg = GOAL_NARRATIVE
  if (tileId === TILE_SIGNPOST) {
    msg += '\n' + formatNearestPoiSignpostMessage(playerPos, world)
  } else if (tileId === TILE_CASTLE) {
    msg += '\n' + CASTLE_FOUND_MESSAGE
  }
  return msg
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
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: prevUi.message,
      leftPanel: nextLeftPanel,
    },
  }
}

function reduceMove(prevState: State, dx: number, dy: number): State {
  const world = prevState.world
  const prevPos = prevState.player.position
  const nextPos = {
    x: (prevPos.x + dx + world.width) % world.width,
    y: (prevPos.y + dy + world.height) % world.height,
  }

  const tileId = world.tiles[nextPos.y]![nextPos.x]!
  const nextStepCount = (prevState.run.stepCount | 0) + 1

  const prevRes = (prevState.resources || { food: INITIAL_FOOD, farmNextReadyStep: [] }) as Resources
  const prevFood = typeof prevRes.food === 'number' ? (prevRes.food | 0) : 0
  const paidMoveCost = prevFood > 0 && FOOD_MOVE_COST > 0
  let food = paidMoveCost ? Math.max(0, prevFood - FOOD_MOVE_COST) : prevFood

  const farmNextReadyStep = Array.isArray(prevRes.farmNextReadyStep) ? prevRes.farmNextReadyStep.slice() : []
  const farmCount = (world.farms && world.farms.length) || 0
  while (farmNextReadyStep.length < farmCount) farmNextReadyStep.push(0)

  const baseResources: Resources = { food, farmNextReadyStep }

  const foodDeltas: number[] = paidMoveCost ? [-FOOD_MOVE_COST] : []

  const handler = getOnEnterHandler(tileId)
  const outcome = handler({ tileId, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources })

  const nextWorld = outcome.world || world
  const nextResources = outcome.resources || baseResources
  const message = outcome.message
  if (outcome.foodDeltas && outcome.foodDeltas.length) foodDeltas.push(...outcome.foodDeltas)
  const nextHasFoundCastle = prevState.run.hasFoundCastle || tileId === TILE_CASTLE || !!outcome.hasFoundCastle

  const prevUi = getUi(prevState.ui)
  const baseUi: Ui = {
    message,
    leftPanel: clearSpriteFocusIfAny(prevUi),
    clock: prevUi.clock,
    anim: prevUi.anim,
  }

  const baseState: State = {
    world: nextWorld,
    player: { position: nextPos },
    run: { stepCount: nextStepCount, hasFoundCastle: nextHasFoundCastle },
    resources: nextResources,
    ui: baseUi,
  }

  if (!ENABLE_ANIMATIONS) return baseState

  const startFrame = (baseUi.clock && typeof baseUi.clock.frame === 'number' ? baseUi.clock.frame : 0) | 0
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
  return {
    world: baseState.world,
    player: baseState.player,
    run: baseState.run,
    resources: baseState.resources,
    ui: enqueueAnim(uiWith, {
      kind: 'moveSlide',
      startFrame,
      durationFrames: MOVE_SLIDE_FRAMES,
      blocksInput: true,
      params: { fromPos: { x: prevPos.x, y: prevPos.y }, toPos: { x: nextPos.x, y: nextPos.y }, dx, dy },
    }),
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
    const seed = action.seed | 0
    const generated = generateWorld(seed)
    const world = generated.world
    const playerPos = generated.startPosition

    const startTileId = world.tiles[playerPos.y]![playerPos.x]!
    const hasFoundCastle = startTileId === TILE_CASTLE

    return {
      world,
      player: { position: { x: playerPos.x, y: playerPos.y } },
      run: { stepCount: 0, hasFoundCastle },
      resources: { food: INITIAL_FOOD, farmNextReadyStep: new Array(world.farms.length).fill(0) },
      ui: {
        message: initialMessageForStart(startTileId, playerPos, world),
        leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
        clock: { frame: 0 },
        anim: { nextId: 1, active: [] },
      },
    }
  }

  if (prevState == null) return null

  if (action.type === ACTION_RESTART) return reduceRestart(prevState)
  if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState)
  if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState)
  if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx | 0, action.dy | 0)

  if (action.type === ACTION_TICK) {
    const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(getUi(prevState.ui))) : getUi(prevState.ui)
    return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, ui: tickedUi }
  }

  return prevState
}

