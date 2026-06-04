import {
  CAMP_COOLDOWN_MOVES,
  CAMP_COUNT,
  CAMP_EMPTY_LINES,
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
import { applyFoodCapOnGain } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CampCell, CampEncounter, Resources, State } from '../../types'
import {
  applyDeltas,
  gridButton,
  hireCompanion,
  leaveEncounter,
  makeRightGrid,
  offersToGridLayout,
  previewEncounterProvider,
  offersInGridOrder,
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

export const ACTION_CAMP_SEARCH = 'CAMP_SEARCH' as const
export const ACTION_CAMP_HIRE_SCOUT = 'hireScout' as const
export const ACTION_CAMP_LEAVE = 'CAMP_LEAVE' as const

type CampActionSpec = {
  category: OfferCategory
  spriteId: number
  reduce: (s: State) => State
  previewPlate?: (s: State) => readonly { spriteId: number; text: string }[] | null
}

function campSearchPreviewPlate(s: State): readonly { spriteId: number; text: string }[] | null {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  if (!camp.offers.includes(ACTION_CAMP_SEARCH)) return null
  const stepCount = s.run.stepCount
  if (stepCount < (camp.nextReadyStep ?? 0)) return null
  const armyGain = computeCampArmyGain({ seed: s.world.seed, campId: camp.id, stepCount })
  return [
    { spriteId: SPRITES.inventory.food, text: `+${CAMP_FOOD_GAIN}` },
    { spriteId: SPRITES.inventory.army, text: `+${armyGain}` },
  ]
}

function campHireScoutPreviewPlate(s: State): readonly { spriteId: number; text: string }[] | null {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  if (!camp.offers.includes(ACTION_CAMP_HIRE_SCOUT)) return null
  return [{ spriteId: SPRITES.inventory.scout, text: `-${camp.companionHireGold}` }]
}

const CAMP_OFFERS = {
  [ACTION_CAMP_SEARCH]: {
    category: 'economy',
    spriteId: SPRITES.actions.search,
    reduce: reduceCampSearch,
    previewPlate: campSearchPreviewPlate,
  },
  [ACTION_CAMP_HIRE_SCOUT]: {
    category: 'companion_hire',
    spriteId: SPRITES.inventory.scout,
    reduce: reduceCampHireScout,
    previewPlate: campHireScoutPreviewPlate,
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

function campOfferSlot(s: State, slot: keyof ReturnType<typeof offersToGridLayout<CampOfferKind>>): RightGridActionCell | null {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  const offer = offersToGridLayout(camp.offers)[slot]
  return offer ? gridButton(CAMP_OFFERS, offer) : null
}

const campPreviewPlate: PreviewPlateProvider = (s) => {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  const layout = offersToGridLayout(camp.offers)
  const order = offersInGridOrder(camp.offers, layout)
  return previewPlateForOffers(s, order, CAMP_OFFERS)
}

const onEnterCamp: OnEnterTile = ({ cell, world, pos }) => {
  if (cell.kind !== 'camp') return {}
  const camp = getCellAt(world, pos)
  if (!camp || camp.kind !== 'camp') return {}

  const name = camp.name || 'A Camp'
  const message = `${name} Camp`
  const cellId = cellIdForPos(world, pos)
  const encounter: CampEncounter = {
    kind: 'camp',
    sourceCellId: cellId,
    restoreMessage: message,
  }
  const result: TileEnterResult = {
    message,
    encounter,
    enterAnims: [{ kind: 'gridTransition', from: 'overworld', to: 'camp' }],
  }
  return result
}

const reduceCampAction: ReduceEncounterAction = (prevState, action) => {
  if (action.type !== ACTION_CAMP_LEAVE && !(action.type in CAMP_OFFERS)) return null
  if (action.type === ACTION_CAMP_LEAVE) return leaveEncounter(prevState, 'camp')
  return CAMP_OFFERS[action.type as CampOfferKind].reduce(prevState)
}

function reduceCampSearch(prevState: State): State {
  const campCell = getCellAt(prevState.world, prevState.player.position) as CampCell
  const campName = campCell.name || 'A Camp'
  const stepCount = prevState.run.stepCount
  const prevRes = prevState.resources
  const rnd = RNG.createRunCopyRandom(prevState)

  const readyAt = campCell.nextReadyStep ?? 0
  if (stepCount < readyAt) {
    const line = rnd.perMoveLine(CAMP_EMPTY_LINES, { cellId: campCell.id })
    return setEncounterMessage(prevState, `${campName} Camp`, line)
  }

  const armyGain = computeCampArmyGain({ seed: prevState.world.seed, campId: campCell.id, stepCount })
  const nextCampCell: CampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES }
  const nextWorld = setCellAt(prevState.world, prevState.player.position, nextCampCell)
  const gained: Resources = { ...prevRes, food: prevRes.food + CAMP_FOOD_GAIN, armySize: prevRes.armySize + armyGain }
  const nextResources = applyFoodCapOnGain(prevRes, gained)
  const foodGain = nextResources.food - prevRes.food

  const line = rnd.perMoveLine(CAMP_RECRUIT_LINES, { cellId: campCell.id })

  return applyDeltas(
    { ...prevState, world: nextWorld },
    {
      resources: nextResources,
      message: `${campName} Camp\n${line}`,
      deltas: [
        { target: 'food', delta: foodGain },
        { target: 'army', delta: armyGain },
      ],
    },
  )
}

function reduceCampHireScout(prevState: State): State {
  const camp = getCellAt(prevState.world, prevState.player.position) as CampCell
  const prefix = `${camp.name || 'A Camp'} Camp`
  const rnd = RNG.createRunCopyRandom(prevState)
  return hireCompanion(prevState, {
    prefix,
    slotId: 'scout',
    goldCost: camp.companionHireGold,
    successLine: rnd.perMoveLine(CAMP_SCOUT_HIRE_LINES, { cellId: camp.id, salt: 'camp.scout.hire' }),
  })
}

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
    previewPlate: campPreviewPlate,
    previewEncounter: previewEncounterProvider('camp'),
    rightGrid: makeRightGrid({
      leaveAction: { type: ACTION_CAMP_LEAVE },
      centerSpriteId: SPRITES.centers.campfire,
      top: (s) => campOfferSlot(s, 'top'),
      left: (s) => campOfferSlot(s, 'left'),
      bottom: (s) => campOfferSlot(s, 'bottom'),
    }),
  },
}
