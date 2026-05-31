import { WYRM_INITIAL_HEALTH, WYRM_PAY_GOLD_COST } from '../../constants'
import { getCellAt, setCellAt } from '../../cells'
import {
  LAIR_NAME,
  WYRM_BLED_LINES,
  WYRM_ENCOUNTER_LINES,
  WYRM_FLEE_LINES,
  WYRM_NO_GOLD_LINES,
  WYRM_PAYOFF_LINES,
  WYRM_VICTORY_LINES,
} from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { LairCell, World } from '../../types'
import { cellId, placeFeature } from '../../worldgen'
import { fixedEnemySpawn, startCombatEncounter, type CombatVariantConfig } from './combat'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

const onEnterWyrm: OnEnterTile = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'lair') return {}
  const lair = getCellAt(world, pos)
  if (lair.kind !== 'lair') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (lair.isBled) {
    const line = r.perMoveLine(WYRM_BLED_LINES, { cellId: lair.id })
    return { message: `${LAIR_NAME}\n${line}` }
  }

  const tileMessage = `${LAIR_NAME}\n${r.perMoveLine(WYRM_ENCOUNTER_LINES, { cellId: lair.id })}`
  return startCombatEncounter({
    world,
    pos,
    spawnEnemy: fixedEnemySpawn(WYRM_INITIAL_HEALTH),
    encounterMessage: tileMessage,
    restoreMessage: tileMessage,
  })
}

const placeWyrm: PlaceWorldProvider = ({ cells, rngState }) => {
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => here.kind === 'mountain',
    buildCell: ({ x, y }) => ({ kind: 'lair', id: cellId(x, y), isBled: false }),
  })
  return { rngState: res.rngState }
}

const wyrmCombatVariant: CombatVariantConfig = {
  centerSpriteId: SPRITES.centers.wyrm,
  previewPlateLines: (s) => {
    const enc = s.encounter
    if (!enc || enc.kind !== 'combat') return []
    return [
      { spriteId: SPRITES.enemies.heart, text: `${enc.enemyArmySize}` },
      { spriteId: SPRITES.inventory.gold, text: `-${WYRM_PAY_GOLD_COST}` },
    ]
  },
  encounterLines: WYRM_ENCOUNTER_LINES,
  victoryLines: WYRM_VICTORY_LINES,
  fleeLines: WYRM_FLEE_LINES,
  payment: {
    computeCost: () => WYRM_PAY_GOLD_COST,
    successLines: WYRM_PAYOFF_LINES,
    noFundsLines: WYRM_NO_GOLD_LINES,
    onSuccess: (resources) => {
      if (resources.inventory.includes('blood')) return resources
      return { ...resources, inventory: [...resources.inventory, 'blood'] }
    },
  },
  victoryReward: (resources, rngState) => {
    if (resources.inventory.includes('blood')) return { resources, rngState }
    return {
      resources: { ...resources, inventory: [...resources.inventory, 'blood'] },
      rngState,
    }
  },
}

function onWyrmCombatResolved(world: World, sourceCellId: number): World {
  const width = world.width
  const pos = { x: sourceCellId % width, y: Math.floor(sourceCellId / width) }
  const cell = getCellAt(world, pos)
  if (cell.kind !== 'lair') return world
  if (cell.isBled) return world
  const next: LairCell = { ...cell, isBled: true }
  return setCellAt(world, pos, next)
}

export const wyrmMechanic: MechanicDef = {
  id: 'wyrm',
  kinds: ['lair'],
  mapLabel: 'W',
  onEnterTile: onEnterWyrm,
  poiSignpost: {
    rank: 15,
    name: () => LAIR_NAME,
  },
  placeWorld: placeWyrm,
  combatVariant: wyrmCombatVariant,
  onCombatResolved: onWyrmCombatResolved,
}
