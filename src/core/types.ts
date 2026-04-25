import type {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MINIMAP,
} from './constants'

export type Vec2 = { x: number; y: number }

export type TileGrid = number[][]

export type Farm = { position: Vec2; name: string }

export type World = {
  seed: number
  width: number
  height: number
  mapGenAlgorithm: string
  tiles: TileGrid
  castlePosition: Vec2
  farms: Farm[]
  rngState: number
}

export type GeneratedWorld = { world: World; startPosition: Vec2 }

export const LEFT_PANEL_KIND_AUTO = 'auto' as const
export const LEFT_PANEL_KIND_SPRITE = 'sprite' as const
export const LEFT_PANEL_KIND_MINIMAP = 'minimap' as const

export type LeftPanel =
  | { kind: typeof LEFT_PANEL_KIND_AUTO }
  | { kind: typeof LEFT_PANEL_KIND_SPRITE; spriteId: number }
  | { kind: typeof LEFT_PANEL_KIND_MINIMAP }

export type UiClock = { frame: number }

export type MoveSlideAnim = {
  id: number
  kind: 'moveSlide'
  startFrame: number
  durationFrames: number
  blocksInput: boolean
  params: { fromPos: Vec2; toPos: Vec2; dx: number; dy: number }
}

export type FoodDeltaAnim = {
  id: number
  kind: 'foodDelta'
  startFrame: number
  durationFrames: number
  blocksInput: boolean
  params: { delta: number }
}

export type Anim = MoveSlideAnim | FoodDeltaAnim

export type UiAnim = { nextId: number; active: Anim[] }

export type Ui = { message: string; leftPanel: LeftPanel; clock: UiClock; anim: UiAnim }

export type Player = { position: Vec2 }
export type Run = { stepCount: number; hasFoundCastle: boolean }

export type Resources = { food: number; farmNextReadyStep: number[] }

export type State = { world: World; player: Player; run: Run; resources: Resources; ui: Ui }

export type Action =
  | { type: typeof ACTION_NEW_RUN; seed: number }
  | { type: typeof ACTION_RESTART }
  | { type: typeof ACTION_SHOW_GOAL }
  | { type: typeof ACTION_TOGGLE_MINIMAP }
  | { type: typeof ACTION_MOVE; dx: number; dy: number }
  | { type: typeof ACTION_TICK }

