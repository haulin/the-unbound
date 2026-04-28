import { randInt } from '../prng'
import { CAMP_COOLDOWN_MOVES, CAMP_EMPTY_LINES, CAMP_FOOD_GAIN, CAMP_RECRUIT_LINES } from '../constants'
import { getCellAt, setCellAt } from '../cells'
import { pickDeterministicLine } from './poiUtils'
import type { TileEnterHandler } from './types'
import type { CampCell } from '../types'

export const onEnterCamp: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'camp') return { message: '' }

  const campCell = getCellAt(world, pos)
  if (!campCell || campCell.kind !== 'camp') return { message: '' }

  const campName = campCell.name || 'A Camp'
  const readyAt = campCell.nextReadyStep ?? 0

  if (stepCount < readyAt) {
    return {
      message: `${campName} Camp\n${pickDeterministicLine(CAMP_EMPTY_LINES, world.seed, campCell.id, stepCount)}`,
    }
  }

  let rngState = world.rngState
  const rGain = randInt(rngState, 2)
  rngState = rGain.rngState
  const gain = rGain.value + 1

  const rLine = randInt(rngState, CAMP_RECRUIT_LINES.length)
  rngState = rLine.rngState
  const line = CAMP_RECRUIT_LINES[rLine.value] || CAMP_RECRUIT_LINES[0] || ''

  const nextCampCell: CampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES }
  const nextWorld = setCellAt({ ...world, rngState }, pos, nextCampCell)

  return {
    world: nextWorld,
    resources: {
      ...resources,
      food: resources.food + CAMP_FOOD_GAIN,
      armySize: resources.armySize + gain,
    },
    armyDeltas: [gain],
    foodDeltas: [CAMP_FOOD_GAIN],
    message: `${campName} Camp\n${line}`,
  }
}
