import type { Resources, World } from '../types'

export type TileEnterCtx = {
  tileId: number
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
  hasFoundCastle?: boolean
}

export type TileEnterHandler = (ctx: TileEnterCtx) => TileEnterOutcome

