import {
  COMPANION_HIRE_GOLD_MAX,
  COMPANION_HIRE_GOLD_MIN,
  FARM_BUY_FOOD_AMOUNT,
  POI_MAX_OFFERS,
  POI_MIN_OFFERS,
  FARM_BUY_FOOD_GOLD_COST,
  FARM_COUNT,
  FARM_NAME_POOL,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { applyFoodCapOnGain, foodCarryCap, FOOD_CARRY_FULL_MESSAGE } from '../../foodCarry'
import { FARM_BUY_FOOD_LINES, FARM_ENTER_LINES, MULE_BUY_LINES } from '../../lore'
import type { Change } from '../../reducer'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { FarmCell, State } from '../../types'
import {
  buy,
  encounterStableLine,
  leaveEncounter,
  loreMessage,
  makeRightGrid,
  noGoldResponse,
  gridActionCell,
  openNamedPoiEncounter,
  poiTitleFor,
  previewEncounterProvider,
  hireCompanion,
  offersToGridLayout,
  setEncounterMessage,
  type CellBadge,
} from '../encounterHelpers'
import { buildOfferSets, cellId, isTerrainCell, placeNamedFeatureFromSeed } from '../../worldgen'
import type { OfferCategory } from '../../worldgen'
import type {
  MechanicDef,
  OnEnterTile,
  PlaceWorldProvider,
  ReduceEncounterAction,
} from '../types'

export const ACTION_FARM_BUY_FOOD = 'FARM_BUY_FOOD' as const
export const ACTION_FARM_BUY_BEAST = 'FARM_BUY_BEAST' as const
export const ACTION_FARM_LEAVE = 'FARM_LEAVE' as const

type FarmActionSpec = {
  category: OfferCategory
  spriteId: number
  reduce: (s: State, farm: FarmCell) => Change
  badge: (s: State) => CellBadge
}

const FARM_OFFERS = {
  [ACTION_FARM_BUY_FOOD]: {
    category: 'economy',
    spriteId: SPRITES.inventory.food,
    reduce: reduceFarmBuyFood,
    badge: () => ({ variant: 'price', text: `-${FARM_BUY_FOOD_GOLD_COST}` }),
  },
  [ACTION_FARM_BUY_BEAST]: {
    category: 'companion_hire',
    spriteId: SPRITES.inventory.beast,
    reduce: reduceFarmBuyBeast,
    badge: (s) => {
      const farm = getCellAt(s.world, s.player.position) as FarmCell
      return { variant: 'price', text: `-${farm.companionHireGold}` }
    },
  },
} as const satisfies Record<string, FarmActionSpec>

export type FarmOfferKind = keyof typeof FARM_OFFERS
export type FarmAction = { type: FarmOfferKind } | { type: typeof ACTION_FARM_LEAVE }

const FARM_OFFER_POOL = Object.keys(FARM_OFFERS) as FarmOfferKind[]

const onEnterFarm: OnEnterTile = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'farm') return {}
  const farmCell = getCellAt(world, pos)
  if (!farmCell || farmCell.kind !== 'farm') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(FARM_ENTER_LINES, { placeId: farmCell.id })
  return {
    ...openNamedPoiEncounter({
      kind: 'farm',
      sourceCellId: cellIdForPos(world, pos),
      title: poiTitleFor(farmCell.name, 'Farm'),
      enterBody: line,
    }),
    knowsPosition: true,
  }
}

const reduceFarmAction: ReduceEncounterAction = (state, action) => {
  switch (action.type) {
    case ACTION_FARM_LEAVE:
      return leaveEncounter(state, 'farm')
    case ACTION_FARM_BUY_FOOD:
    case ACTION_FARM_BUY_BEAST: {
      const farm = getCellAt(state.world, state.player.position) as FarmCell
      return FARM_OFFERS[action.type].reduce(state, farm)
    }
    default:
      return null
  }
}

function reduceFarmBuyFood(state: State, farm: FarmCell): Change {
  const title = poiTitleFor(farm.name, 'Farm')

  const result = buy(state.resources, { gold: FARM_BUY_FOOD_GOLD_COST, gain: { food: FARM_BUY_FOOD_AMOUNT } })
  if (result.outcome === 'noFunds') return noGoldResponse(state, title)
  if (state.resources.food >= foodCarryCap(state.resources)) {
    return setEncounterMessage(title, FOOD_CARRY_FULL_MESSAGE)
  }

  return {
    resources: applyFoodCapOnGain(state.resources, result.resources),
    message: loreMessage(title, encounterStableLine(state, 'farm.buyFood', FARM_BUY_FOOD_LINES)),
  }
}

const placeNamedFarms: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  const offerSets = buildOfferSets({
    poiCount: FARM_COUNT,
    minOffers: POI_MIN_OFFERS,
    maxOffers: POI_MAX_OFFERS,
    pool: FARM_OFFER_POOL,
    categoryOf: (offer) => FARM_OFFERS[offer].category,
    requiredOnEveryPoi: [ACTION_FARM_BUY_FOOD],
    rng: RNG.createStreamRandomFromSeed(seed, 'farm.offers'),
  })
  let farmIndex = 0

  placeNamedFeatureFromSeed(cells, seed, 'place.farm', {
    count: FARM_COUNT,
    namePool: FARM_NAME_POOL,
    fallbackName: 'A Farm',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      const offers = [...offerSets[farmIndex]!]
      const companionHireGold = rng.intInRange(COMPANION_HIRE_GOLD_MIN, COMPANION_HIRE_GOLD_MAX)
      farmIndex++
      return { kind: 'farm', id: cellId(x, y), name, offers, companionHireGold }
    },
  })
  return { rngState }
}

function farmOfferSlot(s: State, slot: keyof ReturnType<typeof offersToGridLayout<FarmOfferKind>>) {
  const farm = getCellAt(s.world, s.player.position) as FarmCell
  const offer = offersToGridLayout(farm.offers)[slot]
  return offer ? gridActionCell(FARM_OFFERS, offer)(s) : null
}

function reduceFarmBuyBeast(state: State, farm: FarmCell): Change {
  const title = poiTitleFor(farm.name, 'Farm')
  const rnd = RNG.createRunCopyRandom(state)
  return hireCompanion(state, {
    prefix: title,
    slotId: 'beast',
    goldCost: farm.companionHireGold,
    successLine: rnd.perMoveLine(MULE_BUY_LINES, { cellId: farm.id }),
  })
}

const farmRightGrid = makeRightGrid({
  leaveAction: { type: ACTION_FARM_LEAVE },
  top: (s) => farmOfferSlot(s, 'top'),
  left: (s) => farmOfferSlot(s, 'left'),
})

export const farmMechanic: MechanicDef = {
  id: 'farm',
  kinds: ['farm'],
  mapLabel: 'F',
  onEnterTile: onEnterFarm,
  poiSignpost: {
    rank: 20,
    name: (cell) => `${(cell as FarmCell).name || 'A Farm'} Farm`,
  },
  placeWorld: placeNamedFarms,
  encounter: {
    kind: 'farm',
    reduceAction: reduceFarmAction,
    previewEncounter: previewEncounterProvider('farm'),
    rightGrid: farmRightGrid,
    illustrationSpriteId: SPRITES.flavor.farmBarn,
  },
}
