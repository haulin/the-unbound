import { RAINBOW_END_GOLD_PAYOUT, RAINBOW_END_PAYOUT_LINES, RAINBOW_END_SPENT_LINES } from '../../constants'
import { getCellAt, setCellAt } from '../../cells'
import { RNG } from '../../rng'
import type { RainbowEndCell } from '../../types'
import type { MechanicDef, TileEnterHandler } from '../types'

const onEnterRainbowEnd: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'rainbowEnd') return { message: '' }

  const rainbowEndCell = getCellAt(world, pos)
  if (!rainbowEndCell || rainbowEndCell.kind !== 'rainbowEnd') return { message: '' }

  const tileRand = RNG.createTileRandom({ world, stepCount, pos })

  if (rainbowEndCell.hasPaidOut) {
    return { message: tileRand.perMoveLine(RAINBOW_END_SPENT_LINES, { cellId: rainbowEndCell.id }) }
  }

  const nextCell: RainbowEndCell = { ...rainbowEndCell, hasPaidOut: true }
  const nextWorld = setCellAt(world, pos, nextCell)

  return {
    world: nextWorld,
    resources: { ...resources, gold: resources.gold + RAINBOW_END_GOLD_PAYOUT },
    message: tileRand.perMoveLine(RAINBOW_END_PAYOUT_LINES, { cellId: rainbowEndCell.id }),
  }
}

export const rainbowEndMechanic: MechanicDef = {
  id: 'rainbowEnd',
  kinds: ['rainbowEnd'],
  mapLabel: 'R',
  onEnter: onEnterRainbowEnd,
}
