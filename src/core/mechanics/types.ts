import type {
  Action,
  Cell,
  CellGrid,
  CellKind,
  CombatEncounter,
  DeltaAnimTarget,
  Encounter,
  EncounterKind,
  GridFromKind,
  GridToKind,
  Resources,
  State,
  Vec2,
  World,
} from '../types'
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

// Anim a mechanic asks the reducer to enqueue from `TileEnterResult.enterAnims`.
// `afterFrames` is an offset (in frames) relative to the move-slide reveal.
export type AnimSpec = { kind: 'gridTransition'; from: GridFromKind; to: GridToKind; afterFrames?: number }

export type TileEnterCtx = {
  cell: Cell
  world: World
  pos: Vec2
  stepCount: number
  resources: Resources
}

// Single hook covering: tile-enter side effects, optional encounter open, optional cell mutations,
// optional teleport, optional enter-animations.
//
// Field omission semantics:
//   - world / resources / encounter / message omitted = unchanged from caller.
//   - encounter: null is treated the same as omitted (use a real encounter object to open one).
//     The reducer never spontaneously clears state.encounter from a tile-enter — clearing is
//     done by encounter reducers via leaveEncounter.
//   - message omitted = the reducer applies the default-terrain lore message for cell.kind.
//   - teleportTo omitted = no teleport; if set, reducer overrides the player's landing position.
//
// Resource-change popups: the reducer computes one food-delta popup automatically from
// `resources.food` diff (after carry-cap clamping). Mechanics don't pass deltas explicitly.
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
  enterAnims?: readonly AnimSpec[]
}

export type OnEnterTile = (ctx: TileEnterCtx) => TileEnterResult

// Per-encounter action reducer. Returns null to mean "I don't handle this action"
// (the main reducer falls through to global-allowlist or move handling).
// Returns a State (possibly === prevState) to mean "I claim this action".
export type ReduceEncounterAction = (state: State, action: Action) => State | null

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
export type PreviewEncounterProvider = () => Encounter

// The encounter a mechanic owns end-to-end. Nested under `MechanicDef.encounter`
// so the type system enforces "any of these hooks can only exist alongside the
// kind discriminator". The registry indexes each sub-hook by `kind` and rejects
// duplicate kinds across mechanics.
export type MechanicEncounter = {
  kind: EncounterKind
  reduceAction?: ReduceEncounterAction
  rightGrid?: RightGridProvider
  illustrationSpriteId?: (state: State) => number
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
  // Post-combat hook fired by `reduceCombatVictory`, `reduceCombatReturn`
  // (flee), and `reduceCombatPay` (recruit success). Receives the encounter
  // snapshot captured before it's cleared, so the hook can read e.g. the
  // wounded count or the source cell id. Wyrm uses this to flip its lair's
  // `isBled` flag on victory; henge uses it to maintain the persistent-band
  // state machine (flee syncs `currentGroup`, victory/recruit clears it and
  // starts cooldown).
  onCombatClosed?: (state: State, outcome: CombatCloseOutcome, encounter: CombatEncounter) => State
}
