import type {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
} from './constants'
import type { CombatAction } from './mechanics/defs/combat'
import type { LocksmithAction } from './mechanics/defs/locksmith'
import type { CampAction, CampOfferKind } from './mechanics/defs/camp'
import type { CrossingAction } from './mechanics/defs/crossing'
import type { FarmAction, FarmOfferKind } from './mechanics/defs/farm'
import type { TownAction, TownOfferKind } from './mechanics/defs/town'

export type { CampOfferKind, FarmOfferKind, TownOfferKind }

export type Vec2 = { x: number; y: number }

export type TerrainKind = 'grass' | 'road' | 'mountain' | 'swamp' | 'woods'
export type FeatureKind =
  | 'gate'
  | 'gateOpen'
  | 'locksmith'
  | 'lair'
  | 'signpost'
  | 'farm'
  | 'camp'
  | 'henge'
  | 'town'
  | 'crossing'
  | 'fishingLake'
  | 'rainbowEnd'
export type CellKind = TerrainKind | FeatureKind

export type TerrainCell = { kind: TerrainKind }
export type GateCell = { kind: 'gate' }
export type GateOpenCell = { kind: 'gateOpen' }
export type LocksmithCell = { kind: 'locksmith' }
export type LairCell = { kind: 'lair'; id: number; isBled: boolean }
export type SignpostCell = { kind: 'signpost' }
export type FarmCell = {
  kind: 'farm'
  id: number
  name: string
  offers: readonly FarmOfferKind[]
  companionHireGold: number
}
export type CampCell = {
  kind: 'camp'
  id: number
  name: string
  nextReadyStep: number
  offers: readonly CampOfferKind[]
  companionHireGold: number
}
// `currentGroup` tracks the active enemy band so flee returns to the same
// wounded count on re-entry. `null` = no active band (fresh cell, or post-
// defeat-cooldown). Set on fresh roll in `henge.onEnterTile`, updated to
// the wounded count by the flee branch of `henge.onCombatClosed`, cleared
// on victory/recruit. See design § Henge persistence.
export type HengeCell = {
  kind: 'henge'
  id: number
  name: string
  nextReadyStep: number
  currentGroup: number | null
}
export type FishingLakeCell = { kind: 'fishingLake'; id: number; nextReadyStep: number }
export type RainbowEndCell = { kind: 'rainbowEnd'; id: number; hasPaidOut: boolean }

export type TownCell = {
  kind: 'town'
  id: number
  name: string
  offers: readonly TownOfferKind[]
  prices: { foodGold: number; troopsGold: number; rumorGold: number; companionHireGold: number }
  bundles: { food: number; troops: number }
}

export type CrossingCell = {
  kind: 'crossing'
  id: number
  name: string
}

export type Cell =
  | TerrainCell
  | GateCell
  | GateOpenCell
  | LocksmithCell
  | LairCell
  | SignpostCell
  | FarmCell
  | CampCell
  | HengeCell
  | FishingLakeCell
  | RainbowEndCell
  | TownCell
  | CrossingCell

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

// Resource targets a `resourceChanged` DomainEvent can describe. TIC-80's
// delta-popup animation reuses this enum verbatim (hence the legacy "Anim"
// suffix); treat it as a domain resource id, not a renderer concept.
export type DeltaAnimTarget = 'food' | 'gold' | 'army' | 'enemyArmy'

export type HighlightTarget =
  | { band: 'stats'; id: 'food' | 'gold' | 'army' }
  | { band: 'party'; id: string }
  | { band: 'inventory'; id: string }
  | { band: 'meta'; id: 'position' | 'oriented' | 'steps' }

export type Ui = { message: string; leftPanel: LeftPanel }

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
  inventory: string[]
  party: string[]
}

export type CombatEncounter = {
  kind: 'combat'
  enemyArmySize: number
  // Snapshot of `enemyArmySize` at this encounter's open. Used by recruit
  // eligibility ("wounded" = enemyArmySize < initialSpawn) and by reward
  // formulas that scale with the band's starting size. Wounded re-entry
  // (henge persistence) resets this to the resumed count so recruit
  // means "you've struck them this engagement".
  initialSpawn: number
  armyAtCombatStart: number
  sourceCellId: number
  restoreMessage: string
  // Boar opening volley: once per combat encounter (reset when a new fight opens).
  boarVolleyFired: boolean
}

export type CampEncounter = {
  kind: 'camp'
  sourceCellId: number
  restoreMessage: string
}

export type TownEncounter = {
  kind: 'town'
  sourceCellId: number
  restoreMessage: string
  rumorsBought: number
}

export type FarmEncounter = {
  kind: 'farm'
  sourceCellId: number
  restoreMessage: string
}

export type LocksmithEncounter = {
  kind: 'locksmith'
  sourceCellId: number
  restoreMessage: string
}

export type CrossingEncounter = {
  kind: 'crossing'
  sourceCellId: number
  restoreMessage: string
  sellGoldBySlot: Readonly<Record<string, number>>
}

export type Encounter =
  | CombatEncounter
  | CampEncounter
  | TownEncounter
  | FarmEncounter
  | LocksmithEncounter
  | CrossingEncounter
export type EncounterKind = Encounter['kind']

// Grid-transition source/target. Used by `encounterOpened` / `encounterClosed`
// / `teleported` DomainEvents and by TIC-80's grid-transition animation. The
// right-grid cross can fly in/out between the overworld view, an encounter
// view, or a fully blank view (used for teleport "lost" reveals).
export type GridFromKind = 'blank' | 'overworld' | EncounterKind
export type GridToKind = 'overworld' | EncounterKind

// ---- Domain events -----------------------------------------------------------
//
// Pure facts about what just happened in the game world, emitted by reducers
// via `commit()` and consumed by per-platform translators. `phaseBoundary` is
// the one exception — a translator instruction inserted by orchestration code
// (e.g. `applyChanges` between beats) to serialize subsequent events behind
// the prior phase's blocking work.
export type DomainEvent =
  | { kind: 'runStarted' }
  | { kind: 'resourceChanged'; target: DeltaAnimTarget; delta: number }
  | { kind: 'positionChanged'; from: Vec2; to: Vec2; dx: number; dy: number }
  | { kind: 'teleported'; from: Vec2; to: Vec2 }
  | { kind: 'encounterOpened'; encounterKind: EncounterKind }
  | {
      kind: 'encounterClosed'
      encounterKind: EncounterKind
      outcome: 'leave' | 'victory' | 'flee' | 'paid' | 'recruit' | 'purchase'
    }
  | { kind: 'iconHighlighted'; target: HighlightTarget }
  | { kind: 'phaseBoundary' }

export type State = {
  world: World
  player: Player
  run: Run
  resources: Resources
  encounter: Encounter | null
  ui: Ui
  pendingEvents: readonly DomainEvent[]
}

// Global actions + per-mechanic action unions aggregated from the defs.
export type Action =
  | { type: typeof ACTION_NEW_RUN; seed: number }
  | { type: typeof ACTION_RESTART }
  | { type: typeof ACTION_SHOW_GOAL }
  | { type: typeof ACTION_TOGGLE_MINIMAP }
  | { type: typeof ACTION_TOGGLE_MAP }
  | { type: typeof ACTION_MOVE; dx: number; dy: number }
  | CombatAction
  | CampAction
  | TownAction
  | FarmAction
  | LocksmithAction
  | CrossingAction

