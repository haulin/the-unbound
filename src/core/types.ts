import type {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOGGLE_MINIMAP,
} from './constants'

export type Vec2 = { x: number; y: number }

export type TerrainKind = 'grass' | 'road' | 'mountain' | 'lake' | 'swamp' | 'woods' | 'rainbow'
export type FeatureKind = 'castle' | 'signpost' | 'farm' | 'camp'
export type CellKind = TerrainKind | FeatureKind

export type TerrainCell = { kind: TerrainKind }
export type CastleCell = { kind: 'castle' }
export type SignpostCell = { kind: 'signpost' }
export type FarmCell = { kind: 'farm'; id: number; name: string; nextReadyStep: number }
export type CampCell = { kind: 'camp'; id: number; name: string; nextReadyStep: number }
export type Cell = TerrainCell | CastleCell | SignpostCell | FarmCell | CampCell

export type CellGrid = Cell[][]

export type World = {
  seed: number
  width: number
  height: number
  mapGenAlgorithm: string
  cells: CellGrid
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

export type BaseAnim = {
  id: number
  startFrame: number
  durationFrames: number
  blocksInput: boolean
}

export type MoveSlideAnim = BaseAnim & {
  kind: 'moveSlide'
  params: { fromPos: Vec2; toPos: Vec2; dx: number; dy: number }
}

export type FoodDeltaAnim = BaseAnim & {
  kind: 'foodDelta'
  params: { delta: number }
}

export type ArmyDeltaAnim = BaseAnim & {
  kind: 'armyDelta'
  params: { delta: number }
}

export type Anim = MoveSlideAnim | FoodDeltaAnim | ArmyDeltaAnim

export type UiAnim = { nextId: number; active: Anim[] }

export type Ui = { message: string; leftPanel: LeftPanel; clock: UiClock; anim: UiAnim }

export type Player = { position: Vec2 }
export type Run = { stepCount: number; hasFoundCastle: boolean; isGameOver: boolean }

export type Resources = {
  food: number
  armySize: number
}

export type State = { world: World; player: Player; run: Run; resources: Resources; ui: Ui }

export type Action =
  | { type: typeof ACTION_NEW_RUN; seed: number }
  | { type: typeof ACTION_RESTART }
  | { type: typeof ACTION_SHOW_GOAL }
  | { type: typeof ACTION_TOGGLE_MINIMAP }
  | { type: typeof ACTION_MOVE; dx: number; dy: number }
  | { type: typeof ACTION_TICK }

