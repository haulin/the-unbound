import type { Cell, CellKind, Encounter, Resources, State, World } from '../types'
import type { RightGridCellDef } from '../rightGrid'

export type MoveEventSource = 'woods' | 'mountain' | 'swamp' | 'henge'
export type MoveEvent =
  | { kind: 'fight'; source: MoveEventSource }
  | { kind: 'lost'; source: 'woods' | 'swamp' }

export type MoveEventPolicy = {
  ambushPercent: number
  lostPercent: number
  scoutLostHalves?: boolean
}

export type TileEnterCtx = {
  cell: Cell
  world: World
  pos: { x: number; y: number }
  stepCount: number
  resources: Resources
}

export type TileEnterOutcome = {
  world?: World
  resources?: Resources
  message: string
  foodDeltas?: number[]
  armyDeltas?: number[]
  hasWon?: boolean
  knowsPosition?: boolean
}

export type TileEnterHandler = (ctx: TileEnterCtx) => TileEnterOutcome

export type StartEncounterFn = (args: { kind: CellKind; cellId: number; restoreMessage: string }) => Encounter

export type EncounterKind = Encounter['kind']
export type RightGridProvider = (s: State, row: number, col: number) => RightGridCellDef

export type MechanicDef = {
  id: string
  kinds: readonly CellKind[]
  mapLabel?: string
  enterFoodCostByKind?: Partial<Record<CellKind, number>>
  moveEventPolicyByKind?: Partial<Record<CellKind, MoveEventPolicy>>

  onEnter?: TileEnterHandler
  startEncounter?: StartEncounterFn
  rightGridEncounterKind?: EncounterKind
  rightGrid?: RightGridProvider
}
