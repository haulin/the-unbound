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
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { FarmCell, FarmEncounter, State } from '../../types'
import {
  applyDeltas,
  buy,
  encounterStableLine,
  gridButton,
  leaveEncounter,
  makeRightGrid,
  noGoldResponse,
  previewEncounterProvider,
  offersInGridOrder,
  hireCompanion,
  offersToGridLayout,
  previewPlateForOffers,
  setEncounterMessage,
  type RightGridActionCell,
} from '../encounterHelpers'
import { buildOfferSets, cellId, isTerrainCell, placeNamedFeatureFromSeed } from '../../worldgen'
import type { OfferCategory } from '../../worldgen'
import type {
  MechanicDef,
  OnEnterTile,
  PlaceWorldProvider,
  PreviewPlateProvider,
  ReduceEncounterAction,
  TileEnterResult,
} from '../types'

export const ACTION_FARM_BUY_FOOD = 'FARM_BUY_FOOD' as const
export const ACTION_FARM_BUY_BEAST = 'FARM_BUY_BEAST' as const
export const ACTION_FARM_LEAVE = 'FARM_LEAVE' as const

function farmBuyFoodPreview(_s: State): readonly { spriteId: number; text: string }[] {
  return [{ spriteId: SPRITES.inventory.food, text: `-${FARM_BUY_FOOD_GOLD_COST}` }]
}

function farmHireMulePreview(s: State): readonly { spriteId: number; text: string }[] {
  const farm = getCellAt(s.world, s.player.position) as FarmCell
  return [{ spriteId: SPRITES.inventory.beast, text: `-${farm.companionHireGold}` }]
}

type FarmActionSpec = {
  category: OfferCategory
  spriteId: number
  reduce: (s: State, farm: FarmCell) => State
  previewPlate: (s: State) => readonly { spriteId: number; text: string }[]
}

const FARM_OFFERS = {
  [ACTION_FARM_BUY_FOOD]: {
    category: 'economy',
    spriteId: SPRITES.inventory.food,
    reduce: reduceFarmBuyFood,
    previewPlate: farmBuyFoodPreview,
  },
  [ACTION_FARM_BUY_BEAST]: {
    category: 'companion_hire',
    spriteId: SPRITES.inventory.beast,
    reduce: reduceFarmBuyBeast,
    previewPlate: farmHireMulePreview,
  },
} as const satisfies Record<string, FarmActionSpec>

export type FarmOfferKind = keyof typeof FARM_OFFERS
export type FarmAction = { type: FarmOfferKind } | { type: typeof ACTION_FARM_LEAVE }

const FARM_OFFER_POOL = Object.keys(FARM_OFFERS) as FarmOfferKind[]

function farmPrefix(farm: FarmCell): string {
  const name = farm.name || 'A Farm'
  return `${name} Farm`
}

const onEnterFarm: OnEnterTile = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'farm') return {}
  const farmCell = getCellAt(world, pos)
  if (!farmCell || farmCell.kind !== 'farm') return {}

  const name = farmCell.name || 'A Farm'
  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(FARM_ENTER_LINES, { placeId: farmCell.id })
  const message = `${name} Farm\n${line}`
  const cellId = cellIdForPos(world, pos)
  const encounter: FarmEncounter = {
    kind: 'farm',
    sourceCellId: cellId,
    restoreMessage: message,
  }
  const result: TileEnterResult = {
    message,
    knowsPosition: true,
    encounter,
    enterAnims: [{ kind: 'gridTransition', from: 'overworld', to: 'farm' }],
  }
  return result
}

const reduceFarmAction: ReduceEncounterAction = (prevState, action) => {
  if (action.type !== ACTION_FARM_LEAVE && !(action.type in FARM_OFFERS)) return null
  if (action.type === ACTION_FARM_LEAVE) return leaveEncounter(prevState, 'farm')

  const farm = getCellAt(prevState.world, prevState.player.position) as FarmCell
  return FARM_OFFERS[action.type as FarmOfferKind].reduce(prevState, farm)
}

function reduceFarmBuyFood(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
    return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE)
  }

  const result = buy(prevState.resources, { gold: FARM_BUY_FOOD_GOLD_COST, gain: { food: FARM_BUY_FOOD_AMOUNT } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix)

  const clamped = applyFoodCapOnGain(prevState.resources, result.resources)
  const appliedFoodDelta = clamped.food - prevState.resources.food
  const deltas = result.deltas.map((d) => (d.target === 'food' ? { ...d, delta: appliedFoodDelta } : d))

  const line = encounterStableLine(prevState, 'farm.buyFood', FARM_BUY_FOOD_LINES)
  return applyDeltas(prevState, {
    resources: clamped,
    message: `${prefix}\n${line}`,
    deltas,
  })
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

function farmOfferSlot(s: State, slot: keyof ReturnType<typeof offersToGridLayout<FarmOfferKind>>): RightGridActionCell | null {
  const farm = getCellAt(s.world, s.player.position) as FarmCell
  const offer = offersToGridLayout(farm.offers)[slot]
  return offer ? gridButton(FARM_OFFERS, offer) : null
}

const farmPreviewPlate: PreviewPlateProvider = (s) => {
  const here = getCellAt(s.world, s.player.position)
  if (!here || here.kind !== 'farm') return null
  const layout = offersToGridLayout(here.offers)
  const order = offersInGridOrder(here.offers, layout)
  return previewPlateForOffers(s, order, FARM_OFFERS)
}

function reduceFarmBuyBeast(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  const rnd = RNG.createRunCopyRandom(prevState)
  return hireCompanion(prevState, {
    prefix,
    slotId: 'beast',
    goldCost: farm.companionHireGold,
    successLine: rnd.perMoveLine(MULE_BUY_LINES, { cellId: farm.id }),
  })
}

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
    previewPlate: farmPreviewPlate,
    previewEncounter: previewEncounterProvider('farm'),
    rightGrid: makeRightGrid({
      leaveAction: { type: ACTION_FARM_LEAVE },
      centerSpriteId: SPRITES.centers.farmBarn,
      top: (s) => farmOfferSlot(s, 'top'),
      left: (s) => farmOfferSlot(s, 'left'),
    }),
  },
}
