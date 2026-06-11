import type {
  Action,
  Cell,
  CellGrid,
  CellKind,
  CombatEncounter,
  DeltaAnimTarget,
  DomainEvent,
  Encounter,
  EncounterKind,
  Resources,
  State,
  Vec2,
  World,
} from '../types'
import type { Change } from '../reducer'
import type { RightGridCellDef } from '../rightGrid'
import type { CombatCloseOutcome, CombatVariantConfig } from './defs/combat'

// PoI signpost contribution. Ranks are conventionally multiples of 10 so new
// PoIs can slot between existing ones without renumbering (e.g. Lair=15 between
// locksmith=10 and farm=20). Lower rank wins distance ties.
export type PoiSignpostContribution = {
  rank: number
  name: (cell: Cell) => string
}

export type MoveEventSource = 'woods' | 'mountain' | 'swamp' | 'henge'
export type MoveEvent =
  | { kind: 'fight'; source: MoveEventSource }
  | { kind: 'lost'; source: MoveEventSource }

export type MoveEventPolicy = {
  ambushPercent: number
  lostPercent: number
  scoutLostHalves?: boolean
}

export type RightGridProvider = (s: State, row: number, col: number) => RightGridCellDef

export type TileEnterCtx = {
  cell: Cell
  world: World
  pos: Vec2
  stepCount: number
  resources: Resources
}

// Single hook covering: tile-enter side effects, optional encounter open, optional cell mutations,
// optional teleport.
//
// Field omission semantics:
//   - world / resources / encounter / message omitted = unchanged from caller.
//   - encounter: null is treated the same as omitted (use a real encounter object to open one).
//     The reducer never spontaneously clears state.encounter from a tile-enter — clearing is
//     done by encounter reducers via leaveEncounter.
//   - message omitted = the reducer applies the default-terrain lore message for cell.kind.
//   - teleportTo omitted = no teleport; if set, reducer overrides the player's landing position.
//
// Resource-change popups: `commit()` auto-derives `resourceChanged` events
// from the prev → next resources diff (post carry-cap clamp), so handlers
// never build delta arrays. Encounter-open: `reduceMove` reads `outcome.encounter`
// and emits an explicit `encounterOpened` event on the arrival beat — handlers
// only set the field; the event is the reducer's job.
export type TileEnterResult = {
  world?: World
  resources?: Resources
  encounter?: Encounter | null
  message?: string
  hasWon?: boolean
  // Truth-only hint: OR'd into prev `run.knowsPosition`. A handler cannot force this back to
  // false from here — only `teleportTo` clears the player's known position.
  knowsPosition?: boolean
  teleportTo?: Vec2 | null
  events?: readonly DomainEvent[]
}

export type OnEnterTile = (ctx: TileEnterCtx) => TileEnterResult

// Per-encounter action reducer. Returns:
//   - `null` for "I don't handle this action" (the main reducer falls through
//     to global-allowlist or move handling).
//   - A single `Change` for a one-beat action (most PoI offers).
//   - A `Change[]` for a multi-beat action (combat fight + close, etc.). The
//     dispatcher inserts an implicit `phaseBoundary` event between beats so
//     each beat's blocking animations serialize cleanly.
export type EncounterReducerResult = Change | readonly Change[] | null
export type ReduceEncounterAction = (state: State, action: Action) => EncounterReducerResult

// Mechanic-owned feature placement during worldgen. The runner in `world.ts`
// calls each mechanic's `placeWorld` in `MECHANICS` array order; each placer
// draws from `place.<kind>` via `seed` and returns `rngState` unchanged.
// Peer-aware placers (locksmith ↔ gate) read already-placed cells, not other
// mechanics' RNG streams.
export type PlaceWorldProvider = (args: { cells: CellGrid; rngState: number; seed: number }) => { rngState: number }

// Grid-cell anchor for animated +/- delta popups (e.g. enemyArmy on Fight badge).
export type DeltaAnchorSpec = {
  row: number
  col: number
  goodSign?: 1 | -1
}

// Placeholder encounter used by `rightGridRenderPlan` to synthesize "what the
// cross would look like with this encounter open" for grid transitions. Never
// reduced over — only fed to the right-grid sprite resolver.
export type PreviewEncounterProvider = (state: State) => Encounter

// The encounter a mechanic owns end-to-end. Nested under `MechanicDef.encounter`
// so the type system enforces "any of these hooks can only exist alongside the
// kind discriminator". The registry indexes each sub-hook by `kind` and rejects
// duplicate kinds across mechanics.
export type MechanicEncounter = {
  kind: EncounterKind
  reduceAction?: ReduceEncounterAction
  rightGrid?: RightGridProvider
  illustrationSpriteId?: number | ((state: State) => number)
  deltaAnchorsByTarget?: Partial<Record<DeltaAnimTarget, DeltaAnchorSpec>>
  previewEncounter?: PreviewEncounterProvider
}

export type MechanicDef = {
  id: string
  kinds: readonly CellKind[]
  mapLabel?: string
  enterFoodCostByKind?: Partial<Record<CellKind, number>>
  moveEventPolicyByKind?: Partial<Record<CellKind, MoveEventPolicy>>

  onEnterTile?: OnEnterTile
  encounter?: MechanicEncounter

  poiSignpost?: PoiSignpostContribution
  placeWorld?: PlaceWorldProvider

  combatVariantByKind?: Partial<Record<CellKind, CombatVariantConfig>>
  // Post-combat hook invoked by `buildCombatCloseBeat` on the close path of
  // `reduceCombatFight` (victory), `reduceCombatReturn` (flee), and
  // `reduceCombatPay` (paid / recruit). Receives a synthetic snapshot with
  // the encounter still set, so the hook can read e.g. the wounded count or
  // the source cell id. Wyrm uses this to flip its lair's `isBled` flag on
  // victory; henge uses it to maintain the persistent-band state machine
  // (flee syncs `currentGroup`, victory/recruit clears it and starts cooldown).
  onCombatClosed?: (state: State, outcome: CombatCloseOutcome, encounter: CombatEncounter) => State
}
