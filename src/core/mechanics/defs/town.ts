import {
  BARKEEP_TIPS,
  COMPANION_HIRE_GOLD_MAX,
  COMPANION_HIRE_GOLD_MIN,
  HEALER_UPKEEP_GOLD,
  POI_MAX_OFFERS,
  POI_MIN_OFFERS,
  TOWN_BUY_LINES,
  TOWN_COUNT,
  TOWN_ENTER_LINES,
  TOWN_FOOD_BUNDLE,
  TOWN_NAME_POOL,
  TOWN_PRICE_FOOD_MAX,
  TOWN_PRICE_FOOD_MIN,
  TOWN_PRICE_RUMOR_MAX,
  TOWN_PRICE_RUMOR_MIN,
  TOWN_PRICE_TROOPS_MAX,
  TOWN_PRICE_TROOPS_MIN,
  TOWN_RUMOR_EXHAUSTED_LINES,
  TOWN_RUMORS_PER_VISIT_MAX,
  TOWN_SCOUT_HIRE_LINES,
  TOWN_TROOPS_BUNDLE,
  HEALER_BUY_LINES,
  NO_GOLD_LINES,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { applyFoodCapOnGainWithEvents, foodCarryCap } from '../../foodCarry'
import type { Change } from '../../reducer'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Cell, State, TownCell, TownEncounter } from '../../types'
import {
  buy,
  encounterStableLine,
  leaveEncounter,
  loreMessage,
  makeRightGrid,
  feedbackChange,
  gridActionCell,
  openNamedPoiEncounter,
  poiTitleFor,
  previewEncounterProvider,
  hireCompanion,
  iconHighlighted,
  offersToGridLayout,
  refuseCompanionHire,
  foodCarryFullResponse,
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

export const ACTION_TOWN_BUY_FOOD = 'buyFood' as const
export const ACTION_TOWN_BUY_TROOPS = 'buyTroops' as const
export const ACTION_TOWN_HIRE_SCOUT = 'hireScout' as const
export const ACTION_TOWN_HIRE_HEALER = 'hireHealer' as const
export const ACTION_TOWN_BUY_RUMOR = 'buyRumors' as const
export const ACTION_TOWN_LEAVE = 'TOWN_LEAVE' as const

type TownPriceKey = keyof TownCell['prices']

function townPriceBadge(s: State, priceKey: TownPriceKey): CellBadge {
  const town = getCellAt(s.world, s.player.position) as TownCell
  return { variant: 'price', text: `-${town.prices[priceKey]}` }
}

type TownOfferSpec = {
  category: OfferCategory
  spriteId: number
  priceKey: TownPriceKey
  reduce: (s: State, town: TownCell) => Change
  badge: (s: State) => CellBadge
}

const TOWN_OFFERS = {
  [ACTION_TOWN_BUY_FOOD]: {
    category: 'economy',
    spriteId: SPRITES.inventory.food,
    priceKey: 'foodGold',
    reduce: reduceTownBuyFood,
    badge: (s) => townPriceBadge(s, 'foodGold'),
  },
  [ACTION_TOWN_BUY_TROOPS]: {
    category: 'economy',
    spriteId: SPRITES.inventory.army,
    priceKey: 'troopsGold',
    reduce: reduceTownBuyTroops,
    badge: (s) => townPriceBadge(s, 'troopsGold'),
  },
  [ACTION_TOWN_HIRE_SCOUT]: {
    category: 'companion_hire',
    spriteId: SPRITES.inventory.scout,
    priceKey: 'companionHireGold',
    reduce: reduceTownHireScout,
    badge: (s) => townPriceBadge(s, 'companionHireGold'),
  },
  [ACTION_TOWN_HIRE_HEALER]: {
    category: 'companion_hire',
    spriteId: SPRITES.inventory.healer,
    priceKey: 'companionHireGold',
    reduce: reduceTownHireHealer,
    badge: (s) => townPriceBadge(s, 'companionHireGold'),
  },
  [ACTION_TOWN_BUY_RUMOR]: {
    category: 'economy',
    spriteId: SPRITES.actions.rumor,
    priceKey: 'rumorGold',
    reduce: reduceTownBuyRumor,
    badge: (s) => townPriceBadge(s, 'rumorGold'),
  },
} as const satisfies Record<string, TownOfferSpec>

export type TownOfferKind = keyof typeof TOWN_OFFERS
export type TownAction = { type: TownOfferKind } | { type: typeof ACTION_TOWN_LEAVE }

const TOWN_OFFER_POOL = Object.keys(TOWN_OFFERS) as TownOfferKind[]

function rumorPool(): readonly string[] {
  const pool: string[] = []
  const groups = Object.values(BARKEEP_TIPS) as Array<readonly string[]>
  for (let i = 0; i < groups.length; i++) {
    const lines = groups[i]!
    for (let j = 0; j < lines.length; j++) pool.push(lines[j]!)
  }
  return pool
}

const onEnterTown: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'town') return {}
  const town = getCellAt(world, pos)
  if (!town || town.kind !== 'town') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(TOWN_ENTER_LINES, { placeId: town.id })
  let nextResources = resources
  const healerUpkeep =
    resources.party.includes('healer') && resources.gold >= HEALER_UPKEEP_GOLD
  if (healerUpkeep) {
    nextResources = { ...resources, gold: resources.gold - HEALER_UPKEEP_GOLD }
  }
  const opened = openNamedPoiEncounter({
    kind: 'town',
    sourceCellId: cellIdForPos(world, pos),
    title: poiTitleFor(town.name, 'Town'),
    enterBody: line,
    extra: { rumorsBought: 0 },
  })
  return {
    ...opened,
    knowsPosition: true,
    resources: nextResources,
    ...(healerUpkeep ? { events: [iconHighlighted({ band: 'party', id: 'healer' })] } : {}),
  }
}

const reduceTownAction: ReduceEncounterAction = (state, action) => {
  switch (action.type) {
    case ACTION_TOWN_LEAVE:
      return leaveEncounter(state, 'town')
    case ACTION_TOWN_BUY_FOOD:
    case ACTION_TOWN_BUY_TROOPS:
    case ACTION_TOWN_HIRE_SCOUT:
    case ACTION_TOWN_HIRE_HEALER:
    case ACTION_TOWN_BUY_RUMOR: {
      const town = getCellAt(state.world, state.player.position) as TownCell
      return TOWN_OFFERS[action.type].reduce(state, town)
    }
    default:
      return null
  }
}

function townGoldShortfall(state: State, title: string, action: string): Change {
  return feedbackChange(state, {
    action,
    category: 'purchase',
    outcome: 'failure',
    reason: { kind: 'shortfall', resource: 'gold' },
    message: loreMessage(title, encounterStableLine(state, `${action}.shortfall`, NO_GOLD_LINES)),
  })
}

function reduceTownBuyFood(state: State, town: TownCell): Change {
  const title = poiTitleFor(town.name, 'Town')

  const result = buy(state.resources, { gold: town.prices.foodGold, gain: { food: town.bundles.food } })
  if (result.outcome === 'shortfall') return townGoldShortfall(state, title, 'town.buyFood')
  if (state.resources.food >= foodCarryCap(state.resources)) {
    return foodCarryFullResponse(title)
  }

  const capped = applyFoodCapOnGainWithEvents(state.resources, result.resources)
  return {
    resources: capped.resources,
    ...(capped.events.length ? { events: capped.events } : {}),
    message: loreMessage(title, encounterStableLine(state, 'town.buyFood', TOWN_BUY_LINES)),
  }
}

function reduceTownBuyTroops(state: State, town: TownCell): Change {
  const title = poiTitleFor(town.name, 'Town')
  const result = buy(state.resources, { gold: town.prices.troopsGold, gain: { armySize: town.bundles.troops } })
  if (result.outcome === 'shortfall') return townGoldShortfall(state, title, 'town.buyTroops')

  return {
    resources: result.resources,
    message: loreMessage(title, encounterStableLine(state, 'town.buyTroops', TOWN_BUY_LINES)),
  }
}

function reduceTownHireScout(state: State, town: TownCell): Change {
  const title = poiTitleFor(town.name, 'Town')
  const refused = refuseCompanionHire(state, title, 'scout')
  if (refused) return refused

  const result = buy(state.resources, { gold: town.prices.companionHireGold, gain: { party: ['scout'] } })
  if (result.outcome === 'shortfall') return townGoldShortfall(state, title, 'town.hireScout')

  const rnd = RNG.createRunCopyRandom(state)
  return {
    resources: result.resources,
    message: loreMessage(title, rnd.perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: town.id })),
  }
}

function reduceTownHireHealer(state: State, town: TownCell): Change {
  const title = poiTitleFor(town.name, 'Town')
  const rnd = RNG.createRunCopyRandom(state)
  return hireCompanion(state, {
    prefix: title,
    slotId: 'healer',
    goldCost: town.prices.companionHireGold,
    successLine: rnd.perMoveLine(HEALER_BUY_LINES, { cellId: town.id }),
  })
}

function reduceTownBuyRumor(state: State, town: TownCell): Change {
  const title = poiTitleFor(town.name, 'Town')
  const enc = state.encounter as TownEncounter
  if (enc.rumorsBought >= TOWN_RUMORS_PER_VISIT_MAX) {
    return setEncounterMessage(title, encounterStableLine(state, 'rumor.cap', TOWN_RUMOR_EXHAUSTED_LINES))
  }

  const result = buy(state.resources, { gold: town.prices.rumorGold, gain: {} })
  if (result.outcome === 'shortfall') return townGoldShortfall(state, title, 'town.buyRumor')

  const pool = rumorPool()
  const pick = RNG.createRunCopyRandom(state).advanceCursor(`town.rumor.${town.id}`, pool, { salt: town.id })
  const nextEncounter: TownEncounter = { ...enc, rumorsBought: enc.rumorsBought + 1 }
  return {
    encounter: nextEncounter,
    run: pick.nextState.run,
    resources: result.resources,
    message: loreMessage(title, pick.line),
  }
}

const placeNamedTowns: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  const offerSets = buildOfferSets({
    poiCount: TOWN_COUNT,
    minOffers: POI_MIN_OFFERS,
    maxOffers: POI_MAX_OFFERS,
    pool: TOWN_OFFER_POOL,
    categoryOf: (offer) => TOWN_OFFERS[offer].category,
    rng: RNG.createStreamRandomFromSeed(seed, 'town.offers'),
  })
  let townIndex = 0

  placeNamedFeatureFromSeed(cells, seed, 'place.town', {
    count: TOWN_COUNT,
    namePool: TOWN_NAME_POOL,
    fallbackName: 'A Town',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      const offers = [...offerSets[townIndex]!]
      const foodGold = rng.intInRange(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX)
      const troopsGold = rng.intInRange(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX)
      const companionHireGold = rng.intInRange(COMPANION_HIRE_GOLD_MIN, COMPANION_HIRE_GOLD_MAX)
      const rumorGold = rng.intInRange(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX)

      const cell: Cell = {
        kind: 'town',
        id: cellId(x, y),
        name,
        offers,
        prices: { foodGold, troopsGold, companionHireGold, rumorGold },
        bundles: { food: TOWN_FOOD_BUNDLE, troops: TOWN_TROOPS_BUNDLE },
      }
      townIndex++
      return cell
    },
  })
  return { rngState }
}

function townOfferSlot(s: State, slot: keyof ReturnType<typeof offersToGridLayout<TownOfferKind>>) {
  const town = getCellAt(s.world, s.player.position) as TownCell
  const offer = offersToGridLayout(town.offers)[slot]
  return offer ? gridActionCell(TOWN_OFFERS, offer)(s) : null
}

const townRightGrid = makeRightGrid({
  leaveAction: { type: ACTION_TOWN_LEAVE },
  top: (s) => townOfferSlot(s, 'top'),
  left: (s) => townOfferSlot(s, 'left'),
  bottom: (s) => townOfferSlot(s, 'bottom'),
})

export const townMechanic: MechanicDef = {
  id: 'town',
  kinds: ['town'],
  mapLabel: 'T',
  onEnterTile: onEnterTown,
  poiSignpost: {
    rank: 30,
    name: (cell) => `${(cell as TownCell).name || 'A Town'} Town`,
  },
  placeWorld: placeNamedTowns,
  encounter: {
    kind: 'town',
    reduceAction: reduceTownAction,
    previewEncounter: previewEncounterProvider('town'),
    rightGrid: townRightGrid,
    illustrationSpriteId: SPRITES.flavor.marketStall,
  },
}
