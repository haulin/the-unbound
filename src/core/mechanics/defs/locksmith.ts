import {
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  LOCKSMITH_LAIR_MIN_DISTANCE,
  TOWN_NO_GOLD_LINES,
} from '../../constants'
import { cellIdForPos, findCellByKind } from '../../cells'
import {
  LOCKSMITH_ENTER_LINES,
  LOCKSMITH_NAME,
  LOCKSMITH_NO_BLOOD_LINES,
  LOCKSMITH_NO_FOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
} from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { LocksmithEncounter, State } from '../../types'
import {
  applyDeltasAndClose,
  buy,
  leaveEncounter,
  loreMessage,
  makeRightGrid,
  offerGridCell,
  openNamedPoiEncounter,
  previewEncounterProvider,
  setEncounterMessage,
  type CellBadge,
} from '../encounterHelpers'
import { isTerrainCell, placeFeatureFromSeed } from '../../worldgen'
import type {
  MechanicDef,
  OnEnterTile,
  PlaceWorldProvider,
  ReduceEncounterAction,
} from '../types'

export const ACTION_LOCKSMITH_PAY_GOLD = 'LOCKSMITH_PAY_GOLD' as const
export const ACTION_LOCKSMITH_PAY_FOOD = 'LOCKSMITH_PAY_FOOD' as const
export const ACTION_LOCKSMITH_LEAVE = 'LOCKSMITH_LEAVE' as const

type LocksmithActionSpec = {
  spriteId: number
  reduce: (s: State, enc: LocksmithEncounter) => State
  badge: CellBadge
}

const LOCKSMITH_ACTIONS = {
  [ACTION_LOCKSMITH_PAY_GOLD]: {
    spriteId: SPRITES.inventory.gold,
    reduce: reduceLocksmithPayGold,
    badge: { variant: 'price', text: `-${LOCKSMITH_KEY_GOLD_COST}` },
  },
  [ACTION_LOCKSMITH_PAY_FOOD]: {
    spriteId: SPRITES.inventory.food,
    reduce: reduceLocksmithPayFood,
    badge: { variant: 'price', text: `-${LOCKSMITH_KEY_FOOD_COST}` },
  },
} as const satisfies Record<string, LocksmithActionSpec>

export type LocksmithAction =
  | { type: keyof typeof LOCKSMITH_ACTIONS }
  | { type: typeof ACTION_LOCKSMITH_LEAVE }

const onEnterLocksmith: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'locksmith') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (resources.inventory.includes('bronzeKey')) {
    const line = r.perMoveLine(LOCKSMITH_VISITED_LINES)
    return { message: loreMessage(LOCKSMITH_NAME, line) }
  }

  if (!resources.inventory.includes('bloodVial')) {
    const line = r.perMoveLine(LOCKSMITH_NO_BLOOD_LINES)
    return { message: loreMessage(LOCKSMITH_NAME, line) }
  }

  const line = r.stableLine(LOCKSMITH_ENTER_LINES)
  return openNamedPoiEncounter({
    kind: 'locksmith',
    sourceCellId: cellIdForPos(world, pos),
    title: LOCKSMITH_NAME,
    enterBody: line,
  })
}

const reduceLocksmithAction: ReduceEncounterAction = (prevState, action) => {
  if (action.type !== ACTION_LOCKSMITH_LEAVE && !(action.type in LOCKSMITH_ACTIONS)) return null
  if (action.type === ACTION_LOCKSMITH_LEAVE) return leaveEncounter(prevState, 'locksmith')

  const enc = prevState.encounter as LocksmithEncounter
  return LOCKSMITH_ACTIONS[action.type as keyof typeof LOCKSMITH_ACTIONS].reduce(prevState, enc)
}

function reduceLocksmithPayGold(prevState: State, enc: LocksmithEncounter): State {
  const rnd = RNG.createRunCopyRandom(prevState)
  const result = buy(prevState.resources, { gold: LOCKSMITH_KEY_GOLD_COST, gain: { inventory: ['bronzeKey'] } })
  if (result.outcome === 'noFunds') {
    return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: enc.sourceCellId }))
  }
  return applyDeltasAndClose(prevState, {
    resources: consumeBlood(result.resources),
    message: loreMessage(LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)),
    deltas: result.deltas,
  }, 'locksmith')
}

const placeLocksmith: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  const lairPos = findCellByKind(cells, 'lair')
  if (!lairPos) throw new Error('placeLocksmith: wyrm lair must be placed before locksmith')
  placeFeatureFromSeed(cells, seed, 'place.locksmith', {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    awayFrom: { pos: lairPos, minDistance: LOCKSMITH_LAIR_MIN_DISTANCE },
    buildCell: () => ({ kind: 'locksmith' }),
  })
  return { rngState }
}

function reduceLocksmithPayFood(prevState: State, _enc: LocksmithEncounter): State {
  const rnd = RNG.createRunCopyRandom(prevState)
  const result = buy(prevState.resources, { food: LOCKSMITH_KEY_FOOD_COST, gain: { inventory: ['bronzeKey'] } })
  if (result.outcome === 'noFunds') {
    return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_NO_FOOD_LINES))
  }
  return applyDeltasAndClose(prevState, {
    resources: consumeBlood(result.resources),
    message: loreMessage(LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)),
    deltas: result.deltas,
  }, 'locksmith')
}

function consumeBlood(resources: State['resources']): State['resources'] {
  if (!resources.inventory.includes('bloodVial')) return resources
  return { ...resources, inventory: resources.inventory.filter((slot) => slot !== 'bloodVial') }
}

const { provider: locksmithRightGrid, illustrationFor: locksmithIllustration } = makeRightGrid({
  leaveAction: { type: ACTION_LOCKSMITH_LEAVE },
  illustrationSpriteId: SPRITES.centers.locksmithKiln,
  top: offerGridCell(LOCKSMITH_ACTIONS, ACTION_LOCKSMITH_PAY_GOLD),
  left: offerGridCell(LOCKSMITH_ACTIONS, ACTION_LOCKSMITH_PAY_FOOD),
})

export const locksmithMechanic: MechanicDef = {
  id: 'locksmith',
  kinds: ['locksmith'],
  mapLabel: 'L',
  onEnterTile: onEnterLocksmith,
  poiSignpost: {
    rank: 10,
    name: () => LOCKSMITH_NAME,
  },
  placeWorld: placeLocksmith,
  encounter: {
    kind: 'locksmith',
    reduceAction: reduceLocksmithAction,
    previewEncounter: previewEncounterProvider('locksmith'),
    rightGrid: locksmithRightGrid,
    illustrationSpriteId: locksmithIllustration,
  },
}
