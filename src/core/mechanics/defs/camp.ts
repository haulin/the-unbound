import {
  CAMP_COOLDOWN_MOVES,
  CAMP_COUNT,
  CAMP_EMPTY_LINES,
  CAMP_ENTER_LINES,
  CAMP_FOOD_GAIN,
  CAMP_NAME_POOL,
  CAMP_RECRUIT_LINES,
  CAMP_SCOUT_HIRE_LINES,
  COMPANION_HIRE_GOLD_MAX,
  COMPANION_HIRE_GOLD_MIN,
  POI_MAX_OFFERS,
  POI_MIN_OFFERS,
} from '../../constants'
import { cellIdForPos, getCellAt, setCellAt } from '../../cells'
import { applyFoodCapOnGainWithEvents } from '../../foodCarry'
import type { Change } from '../../reducer'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CampCell, Resources, State } from '../../types'
import {
  hireCompanion,
  leaveEncounter,
  loreMessage,
  makeRightGrid,
  gridActionCell,
  openNamedPoiEncounter,
  poiTitleFor,
  previewEncounterProvider,
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

export const ACTION_CAMP_SEARCH = 'CAMP_SEARCH' as const
export const ACTION_CAMP_HIRE_SCOUT = 'hireScout' as const
export const ACTION_CAMP_LEAVE = 'CAMP_LEAVE' as const

type CampActionSpec = {
  category: OfferCategory
  spriteId: number
  reduce: (s: State) => Change
  badge?: (s: State) => CellBadge | null
}

const CAMP_OFFERS = {
  [ACTION_CAMP_SEARCH]: {
    category: 'economy',
    spriteId: SPRITES.actions.search,
    reduce: reduceCampSearch,
  },
  [ACTION_CAMP_HIRE_SCOUT]: {
    category: 'companion_hire',
    spriteId: SPRITES.inventory.scout,
    reduce: reduceCampHireScout,
    badge: (s: State): CellBadge => {
      const camp = getCellAt(s.world, s.player.position) as CampCell
      return { variant: 'price', text: `-${camp.companionHireGold}` }
    },
  },
} as const satisfies Record<string, CampActionSpec>

export type CampOfferKind = keyof typeof CAMP_OFFERS
export type CampAction = { type: CampOfferKind } | { type: typeof ACTION_CAMP_LEAVE }

const CAMP_OFFER_POOL = Object.keys(CAMP_OFFERS) as CampOfferKind[]

export function computeCampArmyGain(args: { seed: number; campId: number; stepCount: number }): number {
  return RNG.keyedIntInRange({ seed: args.seed, stepCount: args.stepCount, cellId: args.campId }, 1, 2)
}

const placeNamedCamps: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  const offerSets = buildOfferSets({
    poiCount: CAMP_COUNT,
    minOffers: POI_MIN_OFFERS,
    maxOffers: POI_MAX_OFFERS,
    pool: CAMP_OFFER_POOL,
    categoryOf: (offer) => CAMP_OFFERS[offer].category,
    rng: RNG.createStreamRandomFromSeed(seed, 'camp.offers'),
  })
  let campIndex = 0

  placeNamedFeatureFromSeed(cells, seed, 'place.camp', {
    count: CAMP_COUNT,
    namePool: CAMP_NAME_POOL,
    fallbackName: 'A Camp',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      const offers = [...offerSets[campIndex]!]
      const companionHireGold = rng.intInRange(COMPANION_HIRE_GOLD_MIN, COMPANION_HIRE_GOLD_MAX)
      campIndex++
      return { kind: 'camp', id: cellId(x, y), name, nextReadyStep: 0, offers, companionHireGold }
    },
  })
  return { rngState }
}

function campOfferSlot(s: State, slot: keyof ReturnType<typeof offersToGridLayout<CampOfferKind>>) {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  const offer = offersToGridLayout(camp.offers)[slot]
  return offer ? gridActionCell(CAMP_OFFERS, offer)(s) : null
}

const onEnterCamp: OnEnterTile = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'camp') return {}
  const camp = getCellAt(world, pos)
  if (!camp || camp.kind !== 'camp') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(CAMP_ENTER_LINES, { placeId: camp.id })
  return openNamedPoiEncounter({
    kind: 'camp',
    sourceCellId: cellIdForPos(world, pos),
    title: poiTitleFor(camp.name, 'Camp'),
    enterBody: line,
  })
}

const reduceCampAction: ReduceEncounterAction = (state, action) => {
  switch (action.type) {
    case ACTION_CAMP_LEAVE:
      return leaveEncounter(state, 'camp')
    case ACTION_CAMP_SEARCH:
    case ACTION_CAMP_HIRE_SCOUT:
      return CAMP_OFFERS[action.type].reduce(state)
    default:
      return null
  }
}

function reduceCampSearch(state: State): Change {
  const campCell = getCellAt(state.world, state.player.position) as CampCell
  const title = poiTitleFor(campCell.name, 'Camp')
  const stepCount = state.run.stepCount
  const prevRes = state.resources
  const rnd = RNG.createRunCopyRandom(state)

  const readyAt = campCell.nextReadyStep ?? 0
  if (stepCount < readyAt) {
    return setEncounterMessage(title, rnd.perMoveLine(CAMP_EMPTY_LINES, { cellId: campCell.id }))
  }

  const armyGain = computeCampArmyGain({ seed: state.world.seed, campId: campCell.id, stepCount })
  const nextCampCell: CampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES }
  const nextWorld = setCellAt(state.world, state.player.position, nextCampCell)
  const gained: Resources = { ...prevRes, food: prevRes.food + CAMP_FOOD_GAIN, armySize: prevRes.armySize + armyGain }
  const capped = applyFoodCapOnGainWithEvents(prevRes, gained)

  return {
    world: nextWorld,
    resources: capped.resources,
    ...(capped.events.length ? { events: capped.events } : {}),
    message: loreMessage(title, rnd.perMoveLine(CAMP_RECRUIT_LINES, { cellId: campCell.id })),
  }
}

function reduceCampHireScout(state: State): Change {
  const camp = getCellAt(state.world, state.player.position) as CampCell
  const title = poiTitleFor(camp.name, 'Camp')
  const rnd = RNG.createRunCopyRandom(state)
  return hireCompanion(state, {
    prefix: title,
    slotId: 'scout',
    goldCost: camp.companionHireGold,
    successLine: rnd.perMoveLine(CAMP_SCOUT_HIRE_LINES, { cellId: camp.id, salt: 'camp.scout.hire' }),
  })
}

const campRightGrid = makeRightGrid({
  leaveAction: { type: ACTION_CAMP_LEAVE },
  top: (s) => campOfferSlot(s, 'top'),
  left: (s) => campOfferSlot(s, 'left'),
  bottom: (s) => campOfferSlot(s, 'bottom'),
})

export const campMechanic: MechanicDef = {
  id: 'camp',
  kinds: ['camp'],
  mapLabel: 'C',
  onEnterTile: onEnterCamp,
  poiSignpost: {
    rank: 40,
    name: (cell) => `${(cell as CampCell).name || 'A Camp'} Camp`,
  },
  placeWorld: placeNamedCamps,
  encounter: {
    kind: 'camp',
    reduceAction: reduceCampAction,
    previewEncounter: previewEncounterProvider('camp'),
    rightGrid: campRightGrid,
    illustrationSpriteId: SPRITES.flavor.campfire,
  },
}
