import type { Action, Cell, CellKind, Encounter, Resources, State, Vec2, World } from '../types'
import type { RightGridCellDef } from '../rightGrid'

export type MoveEventSource = 'woods' | 'mountain' | 'swamp' | 'henge'
export type MoveEvent =
  | { kind: 'fight'; source: MoveEventSource }
  | { kind: 'lost'; source: MoveEventSource }

export type MoveEventPolicy = {
  ambushPercent: number
  lostPercent: number
  scoutLostHalves?: boolean
}

export type EncounterKind = Encounter['kind']
export type RightGridProvider = (s: State, row: number, col: number) => RightGridCellDef

export type GridFromKind = 'blank' | 'overworld' | EncounterKind
export type GridToKind = 'overworld' | EncounterKind

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

export type MechanicDef = {
  id: string
  kinds: readonly CellKind[]
  mapLabel?: string
  enterFoodCostByKind?: Partial<Record<CellKind, number>>
  moveEventPolicyByKind?: Partial<Record<CellKind, MoveEventPolicy>>

  // Tile-enter hook: side effects, optional encounter open, optional teleport, etc.
  onEnterTile?: OnEnterTile

  // The encounter kind this mechanic owns end-to-end: drives both
  // `rightGridByEncounterKind` lookup and `reduceEncounterActionByEncounterKind` dispatch.
  // A mechanic claims at most one encounter kind. The registry validates uniqueness.
  encounterKind?: EncounterKind
  reduceEncounterAction?: ReduceEncounterAction
  rightGrid?: RightGridProvider
}
