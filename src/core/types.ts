import type {
  ACTION_FIGHT,
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RETURN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TICK,
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
} from './constants'

export type Vec2 = { x: number; y: number }

export type TerrainKind = 'grass' | 'road' | 'mountain' | 'lake' | 'swamp' | 'woods' | 'rainbow'
export type FeatureKind = 'gate' | 'gateOpen' | 'locksmith' | 'signpost' | 'farm' | 'camp' | 'henge' | 'town'
export type CellKind = TerrainKind | FeatureKind

export type TerrainCell = { kind: TerrainKind }
export type GateCell = { kind: 'gate' }
export type GateOpenCell = { kind: 'gateOpen' }
export type LocksmithCell = { kind: 'locksmith' }
export type SignpostCell = { kind: 'signpost' }
export type FarmCell = { kind: 'farm'; id: number; name: string; nextReadyStep: number }
export type CampCell = { kind: 'camp'; id: number; name: string; nextReadyStep: number }
export type HengeCell = { kind: 'henge'; id: number; name: string; nextReadyStep: number }

export type TownOfferKind = 'buyFood' | 'buyTroops' | 'hireScout' | 'buyRumors'
export type TownCell = {
  kind: 'town'
  id: number
  name: string
  offers: readonly TownOfferKind[]
  prices: { foodGold: number; troopsGold: number; scoutGold: number; rumorGold: number }
  bundles: { food: number; troops: number }
}

export type Cell = TerrainCell | GateCell | GateOpenCell | LocksmithCell | SignpostCell | FarmCell | CampCell | HengeCell | TownCell

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
export const LEFT_PANEL_KIND_MAP = 'map' as const

export type LeftPanelAuto = { kind: typeof LEFT_PANEL_KIND_AUTO }
export type LeftPanelSprite = { kind: typeof LEFT_PANEL_KIND_SPRITE; spriteId: number }
export type LeftPanelMinimap = { kind: typeof LEFT_PANEL_KIND_MINIMAP }
export type LeftPanelBase = LeftPanelAuto | LeftPanelSprite | LeftPanelMinimap
export type LeftPanelMap = {
  kind: typeof LEFT_PANEL_KIND_MAP
  restoreLeftPanel: LeftPanelBase
  restoreMessage: string
}

export type LeftPanel = LeftPanelBase | LeftPanelMap

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

export type DeltaAnimTarget = 'food' | 'gold' | 'army' | 'enemyArmy'

export type DeltaAnim = BaseAnim & {
  kind: 'delta'
  params: { target: DeltaAnimTarget; delta: number }
}

export type GridTransitionAnim = BaseAnim & {
  kind: 'gridTransition'
  params: { from: 'blank' | 'overworld' | 'combat' | 'camp' | 'town'; to: 'overworld' | 'combat' | 'camp' | 'town' }
}

export type Anim = MoveSlideAnim | DeltaAnim | GridTransitionAnim

export type UiAnim = { nextId: number; active: Anim[] }

export type Ui = { message: string; leftPanel: LeftPanel; clock: UiClock; anim: UiAnim }

export type Player = { position: Vec2 }

export type RunPathStep = { pos: Vec2; isMapped: boolean }
export type Run = {
  stepCount: number
  hasWon: boolean
  isGameOver: boolean
  knowsPosition: boolean
  path: RunPathStep[]
  lostBufferStartIndex: number | null
  copyCursors?: Record<string, number>
}

export type Resources = {
  food: number
  gold: number
  armySize: number
  hasBronzeKey: boolean
  hasScout: boolean
}

export type CombatEncounter = {
  kind: 'combat'
  enemyArmySize: number
  sourceKind: CellKind
  sourceCellId: number
  restoreMessage: string
}

export type CampEncounter = {
  kind: 'camp'
  sourceKind: 'camp'
  sourceCellId: number
  restoreMessage: string
}

export type TownEncounter = {
  kind: 'town'
  sourceKind: 'town'
  sourceCellId: number
  restoreMessage: string
}

export type Encounter = CombatEncounter | CampEncounter | TownEncounter

export type State = { world: World; player: Player; run: Run; resources: Resources; encounter: Encounter | null; ui: Ui }

export type Action =
  | { type: typeof ACTION_NEW_RUN; seed: number }
  | { type: typeof ACTION_RESTART }
  | { type: typeof ACTION_SHOW_GOAL }
  | { type: typeof ACTION_TOGGLE_MINIMAP }
  | { type: typeof ACTION_TOGGLE_MAP }
  | { type: typeof ACTION_MOVE; dx: number; dy: number }
  | { type: typeof ACTION_FIGHT }
  | { type: typeof ACTION_RETURN }
  | { type: typeof ACTION_TICK }
  | { type: typeof ACTION_CAMP_SEARCH }
  | { type: typeof ACTION_CAMP_LEAVE }
  | { type: typeof ACTION_TOWN_BUY_FOOD }
  | { type: typeof ACTION_TOWN_BUY_TROOPS }
  | { type: typeof ACTION_TOWN_HIRE_SCOUT }
  | { type: typeof ACTION_TOWN_BUY_RUMOR }
  | { type: typeof ACTION_TOWN_LEAVE }

