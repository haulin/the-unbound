import {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MINIMAP,
  CASTLE_FOUND_MESSAGE,
  ENABLE_ANIMATIONS,
  GOAL_NARRATIVE,
  MOVE_SLIDE_FRAMES,
  SPR_BUTTON_GOAL,
  TERRAIN_MESSAGE_BY_TILE_ID,
  TILE_CASTLE,
  TILE_SIGNPOST,
} from './constants'
import { formatSignpostMessage } from './signpost'
import { generateWorld } from './world'
import {
  LEFT_PANEL_KIND_AUTO,
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
  type Action,
  type LeftPanel,
  type State,
  type Ui,
  type World,
} from './types'

export function getLeftPanel(ui: Ui): LeftPanel {
  const lp = ui && ui.leftPanel
  if (lp && typeof lp.kind === 'string') return lp as LeftPanel
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

  const u = ui as any
  const message = typeof u.message === 'string' ? u.message : ''
  const leftPanel = getLeftPanel(u as Ui)

  const hasClock = u.clock && typeof u.clock.frame === 'number'
  const clock = { frame: hasClock ? (u.clock.frame | 0) : 0 }

  const hasAnim = u.anim && typeof u.anim === 'object'
  const active = hasAnim && Array.isArray(u.anim.active) ? u.anim.active : []
  const nextId = hasAnim && typeof u.anim.nextId === 'number' ? (u.anim.nextId | 0) : 1

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
  const active = (u.anim && u.anim.active) || []
  const kept: any[] = []

  for (let i = 0; i < active.length; i++) {
    const a = active[i]
    if (!a || typeof a !== 'object') continue
    const startFrame = typeof a.startFrame === 'number' ? (a.startFrame | 0) : 0
    const durationFrames = typeof a.durationFrames === 'number' ? (a.durationFrames | 0) : 0
    const endFrame = startFrame + Math.max(0, durationFrames)
    if (frame < endFrame) kept.push(a)
  }

  if (kept.length === active.length) return u
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: u.clock,
    anim: { nextId: u.anim.nextId, active: kept as any },
  }
}

export function hasBlockingAnim(ui: Ui): boolean {
  const u = getUi(ui)
  const active = (u.anim && u.anim.active) || []
  for (let i = 0; i < active.length; i++) {
    const a = active[i]
    if (a && (a as any).blocksInput) return true
  }
  return false
}

function enqueueAnim(ui: Ui, anim: any): Ui {
  const u = getUi(ui)
  const id = u.anim.nextId | 0
  const a: any = { id }
  const src = anim && typeof anim === 'object' ? anim : {}
  for (const k in src) a[k] = (src as any)[k]
  const nextActive = (u.anim.active || []).concat([a])
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: u.clock,
    anim: { nextId: id + 1, active: nextActive as any },
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
    msg += '\n' + formatSignpostMessage(playerPos, world.castlePosition, world.width, world.height)
  } else if (tileId === TILE_CASTLE) {
    msg += '\n' + CASTLE_FOUND_MESSAGE
  }
  return msg
}

function tileMessage(tileId: number, playerPos: { x: number; y: number }, world: World): string {
  if (tileId === TILE_SIGNPOST) {
    return formatSignpostMessage(playerPos, world.castlePosition, world.width, world.height)
  }
  if (tileId === TILE_CASTLE) return CASTLE_FOUND_MESSAGE
  return TERRAIN_MESSAGE_BY_TILE_ID[tileId] || ''
}

function reduceGoal(s: State): State {
  const prevUi = getUi(s.ui)
  const prevLeftPanel = getLeftPanel(prevUi)
  const nextLeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP
      ? prevLeftPanel
      : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPR_BUTTON_GOAL }
  return {
    world: s.world,
    player: s.player,
    run: s.run,
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: GOAL_NARRATIVE,
      leftPanel: nextLeftPanel as any,
    },
  }
}

function reduceToggleMinimap(s: State): State {
  const prevUi = getUi(s.ui)
  const prevLeftPanel = getLeftPanel(prevUi)
  const nextLeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? { kind: LEFT_PANEL_KIND_AUTO } : { kind: LEFT_PANEL_KIND_MINIMAP }
  return {
    world: s.world,
    player: s.player,
    run: s.run,
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: prevUi.message,
      leftPanel: nextLeftPanel as any,
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
  const nextHasFoundCastle = prevState.run.hasFoundCastle || tileId === TILE_CASTLE
  const prevUi = getUi(prevState.ui)
  const baseUi: Ui = {
    message: tileMessage(tileId, nextPos, world),
    leftPanel: clearSpriteFocusIfAny(prevUi),
    clock: prevUi.clock,
    anim: prevUi.anim,
  }

  const baseState: State = {
    world,
    player: { position: nextPos },
    run: { stepCount: prevState.run.stepCount + 1, hasFoundCastle: nextHasFoundCastle },
    ui: baseUi,
  }

  if (!ENABLE_ANIMATIONS) return baseState

  const startFrame = (baseUi.clock && typeof baseUi.clock.frame === 'number' ? baseUi.clock.frame : 0) | 0
  return {
    world: baseState.world,
    player: baseState.player,
    run: baseState.run,
    ui: enqueueAnim(baseState.ui, {
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
  const a: any = action || {}

  if (prevState == null) {
    if (a.type !== ACTION_NEW_RUN) return null
  }

  if (a.type === ACTION_NEW_RUN) {
    const seed = a.seed | 0
    const generated = generateWorld(seed)
    const world = generated.world
    const playerPos = generated.startPosition

    const startTileId = world.tiles[playerPos.y]![playerPos.x]!
    const hasFoundCastle = startTileId === TILE_CASTLE

    return {
      world,
      player: { position: { x: playerPos.x, y: playerPos.y } },
      run: { stepCount: 0, hasFoundCastle },
      ui: {
        message: initialMessageForStart(startTileId, playerPos, world),
        leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
        clock: { frame: 0 },
        anim: { nextId: 1, active: [] },
      },
    }
  }

  if (prevState == null) return null

  if (a.type === ACTION_RESTART) return reduceRestart(prevState)
  if (a.type === ACTION_SHOW_GOAL) return reduceGoal(prevState)
  if (a.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState)
  if (a.type === ACTION_MOVE) return reduceMove(prevState, a.dx | 0, a.dy | 0)

  if (a.type === ACTION_TICK) {
    const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(getUi(prevState.ui))) : getUi(prevState.ui)
    return { world: prevState.world, player: prevState.player, run: prevState.run, ui: tickedUi }
  }

  return prevState
}

