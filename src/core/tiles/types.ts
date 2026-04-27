import type { Cell, Resources, World } from '../types'

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
  hasFoundCastle?: boolean
}

export type TileEnterHandler = (ctx: TileEnterCtx) => TileEnterOutcome

