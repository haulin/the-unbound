import {
  HENGE_COOLDOWN_MOVES,
  HENGE_COUNT,
  HENGE_EMPTY_LINES,
  HENGE_ENCOUNTER_LINE,
  HENGE_LORE_LINES,
  HENGE_NAME_POOL,
} from '../../constants'
import { cellIdForPos, getCellAt, setCellAt } from '../../cells'
import { RNG } from '../../rng'
import type { HengeCell } from '../../types'
import type { MechanicDef, MoveEventPolicy, OnEnterTile, PlaceWorldProvider } from '../types'
import { rollMoveEvent } from '../moveEvents'
import { startCombatEncounter } from './combat'
import { cellId, isTerrainCell, placeNamedFeature } from '../../worldgen'

const hengePolicy: MoveEventPolicy = { ambushPercent: 100, lostPercent: 0 }

// Henge handler: cooldown check, ambush roll, cooldown-set on the cell, combat-encounter open.
const onEnterHenge: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'henge') return {}

  const hengeCell = getCellAt(world, pos)
  if (!hengeCell || hengeCell.kind !== 'henge') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const name = hengeCell.name || 'A Henge'
  const readyAt = hengeCell.nextReadyStep ?? 0

  if (stepCount < readyAt) {
    const line = r.perMoveLine(HENGE_EMPTY_LINES, { cellId: hengeCell.id })
    return { message: `${name} Henge\n${line}` }
  }

  const cellId = cellIdForPos(world, pos)
  const event = rollMoveEvent({
    policy: hengePolicy,
    hasScout: !!resources.hasScout,
    source: 'henge',
    rngKeys: { seed: world.seed, stepCount, cellId },
  })
  if (event?.kind !== 'fight') {
    const line = r.perMoveLine(HENGE_LORE_LINES, { cellId: hengeCell.id })
    return { message: `${name} Henge\n${line}` }
  }

  const tileMessage = `${name} Henge\n${r.perMoveLine(HENGE_LORE_LINES, { cellId: hengeCell.id })}`
  const result = startCombatEncounter({
    world,
    pos,
    playerArmy: resources.armySize,
    encounterMessage: HENGE_ENCOUNTER_LINE,
    restoreMessage: tileMessage,
  })
  const nextHenge: HengeCell = { ...hengeCell, nextReadyStep: stepCount + HENGE_COOLDOWN_MOVES }
  return { ...result, world: setCellAt(result.world, pos, nextHenge) }
}

const placeHenges: PlaceWorldProvider = ({ cells, rngState }) => {
  const next = placeNamedFeature(cells, rngState, {
    count: HENGE_COUNT,
    namePool: HENGE_NAME_POOL,
    fallbackName: 'A Henge',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name }) => ({ kind: 'henge', id: cellId(x, y), name, nextReadyStep: 0 }),
  })
  return { rngState: next }
}

export const hengeMechanic: MechanicDef = {
  id: 'henge',
  kinds: ['henge'],
  mapLabel: 'H',
  moveEventPolicyByKind: { henge: { ambushPercent: 100, lostPercent: 0 } },
  onEnterTile: onEnterHenge,
  poiSignpost: {
    rank: 50,
    name: (cell) => `${(cell as HengeCell).name || 'A Henge'} Henge`,
  },
  placeWorld: placeHenges,
}
