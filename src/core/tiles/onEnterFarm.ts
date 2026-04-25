import { randInt } from '../prng'
import {
  FARM_COOLDOWN_MOVES,
  FARM_HARVEST_LINES,
  FARM_REVISIT_LINES,
  TILE_FARM,
} from '../constants'
import type { Vec2, World } from '../types'
import type { TileEnterHandler } from './types'

function findFarmIndexAt(world: World, pos: Vec2) {
  for (let i = 0; i < world.farms.length; i++) {
    const f = world.farms[i]!
    if (f.position.x === pos.x && f.position.y === pos.y) return i
  }
  return -1
}

function pickRevisitLine(world: World, farmIndex: number, stepCount: number) {
  const lines = FARM_REVISIT_LINES
  const m = lines.length
  const k = ((world.seed | 0) + (farmIndex | 0) * 7 + (stepCount | 0)) | 0
  const idx = ((k % m) + m) % m
  return lines[idx] || lines[0] || ''
}

export const onEnterFarm: TileEnterHandler = ({ tileId, world, pos, stepCount, resources }) => {
  if (tileId !== TILE_FARM) return { message: '' }

  const farmIndex = findFarmIndexAt(world, pos)
  if (farmIndex < 0) return { message: '' }

  const farmName = world.farms[farmIndex]!.name || 'A Farm'
  const readyAt = ((resources.farmNextReadyStep[farmIndex] ?? 0) | 0) || 0
  if (stepCount < readyAt) {
    return { message: `${farmName} Farm\n${pickRevisitLine(world, farmIndex, stepCount)}` }
  }

  let rngState = (world.rngState | 0) >>> 0
  const rGain = randInt(rngState, 8)
  rngState = rGain.rngState
  const gain = (rGain.value | 0) + 3

  const rLine = randInt(rngState, FARM_HARVEST_LINES.length)
  rngState = rLine.rngState
  const harvestLine = FARM_HARVEST_LINES[rLine.value | 0] || FARM_HARVEST_LINES[0] || ''

  const nextFarmNextReadyStep = resources.farmNextReadyStep.slice()
  nextFarmNextReadyStep[farmIndex] = (stepCount | 0) + FARM_COOLDOWN_MOVES

  return {
    world: { ...world, rngState },
    resources: { food: (resources.food | 0) + gain, farmNextReadyStep: nextFarmNextReadyStep },
    foodDeltas: [gain],
    message: `${farmName} Farm\n${harvestLine}`,
  }
}

