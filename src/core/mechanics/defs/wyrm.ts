import { WYRM_INITIAL_HEALTH, WYRM_PAY_GOLD_COST } from '../../constants'
import { getCellAt, posForCellId, setCellAt } from '../../cells'
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
import type { CombatEncounter, LairCell, State } from '../../types'
import { cellId, placeFeatureFromSeed } from '../../worldgen'
import { fixedEnemySpawn, startCombatEncounter, type CombatCloseOutcome, type CombatVariantConfig } from './combat'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

export const wyrmCombatVariant: CombatVariantConfig = {
  centerSpriteId: SPRITES.centers.wyrm,
  previewPlateLines: (s) => {
    const enc = s.encounter
    if (!enc || enc.kind !== 'combat') return []
    return [
      { spriteId: SPRITES.enemies.hp, text: `${enc.enemyArmySize}` },
      { spriteId: SPRITES.inventory.gold, text: `-${WYRM_PAY_GOLD_COST}` },
    ]
  },
  encounterLines: WYRM_ENCOUNTER_LINES,
  victoryLines: WYRM_VICTORY_LINES,
  fleeLines: WYRM_FLEE_LINES,
  playerRollBonus: 5,
  enemyRollBonus: 5,
  payment: {
    computeCost: () => WYRM_PAY_GOLD_COST,
    isEligible: (_enc, resources) => (resources.gold < WYRM_PAY_GOLD_COST ? 'noFunds' : 'ok'),
    successLines: WYRM_PAYOFF_LINES,
    failLines: { noFunds: WYRM_NO_GOLD_LINES },
    onSuccess: (resources) => {
      if (resources.inventory.includes('bloodVial')) return resources
      return { ...resources, inventory: [...resources.inventory, 'bloodVial'] }
    },
  },
  victoryReward: (resources, rngState) => {
    if (resources.inventory.includes('bloodVial')) return { resources, rngState }
    return {
      resources: { ...resources, inventory: [...resources.inventory, 'bloodVial'] },
      rngState,
    }
  },
}

const onEnterWyrm: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
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
    playerArmySize: resources.armySize,
    spawnEnemy: fixedEnemySpawn(WYRM_INITIAL_HEALTH),
    encounterMessage: tileMessage,
    restoreMessage: tileMessage,
  })
}

const placeWyrm: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  placeFeatureFromSeed(cells, seed, 'place.wyrm', {
    count: 1,
    canPlaceAt: (_x, _y, here) => here.kind === 'mountain',
    buildCell: ({ x, y }) => ({ kind: 'lair', id: cellId(x, y), isBled: false }),
  })
  return { rngState }
}

function onWyrmCombatClosed(state: State, outcome: CombatCloseOutcome, encounter: CombatEncounter): State {
  if (outcome === 'flee') return state
  const pos = posForCellId(state.world, encounter.sourceCellId)
  const cell = getCellAt(state.world, pos)
  if (cell.kind !== 'lair') return state
  if (cell.isBled) return state
  const next: LairCell = { ...cell, isBled: true }
  return { ...state, world: setCellAt(state.world, pos, next) }
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
  combatVariantByKind: { lair: wyrmCombatVariant },
  onCombatClosed: onWyrmCombatClosed,
}
