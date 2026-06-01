import {
  BARKEEP_TIPS,
  TOWN_BUY_LINES,
  TOWN_COUNT,
  TOWN_ENTER_LINES,
  TOWN_FOOD_BUNDLE,
  TOWN_NAME_POOL,
  TOWN_PRICE_FOOD_MAX,
  TOWN_PRICE_FOOD_MIN,
  TOWN_PRICE_RUMOR_MAX,
  TOWN_PRICE_RUMOR_MIN,
  TOWN_PRICE_SCOUT_MAX,
  TOWN_PRICE_SCOUT_MIN,
  TOWN_PRICE_TROOPS_MAX,
  TOWN_PRICE_TROOPS_MIN,
  TOWN_SCOUT_ALREADY_HAVE_LINES,
  TOWN_SCOUT_HIRE_LINES,
  TOWN_TROOPS_BUNDLE,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { applyFoodCapOnGain, foodCarryCap, FOOD_CARRY_FULL_MESSAGE } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Cell, State, TownCell, TownEncounter } from '../../types'
import {
  applyDeltas,
  buy,
  gridButton,
  leaveEncounter,
  makeRightGrid,
  noGoldResponse,
  previewEncounterProvider,
  setEncounterMessage,
  type RightGridActionCell,
} from '../encounterHelpers'
import { cellId, isTerrainCell, placeNamedFeature } from '../../worldgen'
import type {
  MechanicDef,
  OnEnterTile,
  PlaceWorldProvider,
  PreviewPlateProvider,
  ReduceEncounterAction,
  TileEnterResult,
} from '../types'

export const ACTION_TOWN_BUY_FOOD = 'buyFood' as const
export const ACTION_TOWN_BUY_TROOPS = 'buyTroops' as const
export const ACTION_TOWN_HIRE_SCOUT = 'hireScout' as const
export const ACTION_TOWN_BUY_RUMOR = 'buyRumors' as const
export const ACTION_TOWN_LEAVE = 'TOWN_LEAVE' as const

type TownOfferSpec = {
  spriteId: number
  priceKey: keyof TownCell['prices']
  reduce: (s: State, town: TownCell) => State
}

const TOWN_OFFERS = {
  [ACTION_TOWN_BUY_FOOD]:   { spriteId: SPRITES.inventory.food,  priceKey: 'foodGold',   reduce: reduceTownBuyFood   },
  [ACTION_TOWN_BUY_TROOPS]: { spriteId: SPRITES.inventory.troop, priceKey: 'troopsGold', reduce: reduceTownBuyTroops },
  [ACTION_TOWN_HIRE_SCOUT]: { spriteId: SPRITES.inventory.scout, priceKey: 'scoutGold',  reduce: reduceTownHireScout },
  [ACTION_TOWN_BUY_RUMOR]:  { spriteId: SPRITES.actions.rumor,   priceKey: 'rumorGold',  reduce: reduceTownBuyRumor  },
} as const satisfies Record<string, TownOfferSpec>

export type TownOfferKind = keyof typeof TOWN_OFFERS
export type TownAction = { type: TownOfferKind } | { type: typeof ACTION_TOWN_LEAVE }

const BASE_OFFERS = Object.keys(TOWN_OFFERS) as TownOfferKind[]

function townPrefix(town: TownCell): string {
  const name = town.name || 'A Town'
  return `${name} Town`
}

function rumorPool(): readonly string[] {
  const pool: string[] = []
  const groups = Object.values(BARKEEP_TIPS) as Array<readonly string[]>
  for (let i = 0; i < groups.length; i++) {
    const lines = groups[i]!
    for (let j = 0; j < lines.length; j++) pool.push(lines[j]!)
  }
  return pool
}

// ---- Encounter open ----

const onEnterTown: OnEnterTile = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'town') return {}
  const town = getCellAt(world, pos)
  if (!town || town.kind !== 'town') return {}

  const name = town.name || 'A Town'
  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(TOWN_ENTER_LINES, { placeId: town.id })
  const message = `${name} Town\n${line}`
  const cellId = cellIdForPos(world, pos)
  const encounter: TownEncounter = {
    kind: 'town',
    sourceCellId: cellId,
    restoreMessage: message,
  }
  const result: TileEnterResult = {
    message,
    knowsPosition: true,
    encounter,
    enterAnims: [{ kind: 'gridTransition', from: 'overworld', to: 'town' }],
  }
  return result
}

// ---- Encounter actions ----

const reduceTownAction: ReduceEncounterAction = (prevState, action) => {
  if (action.type !== ACTION_TOWN_LEAVE && !(action.type in TOWN_OFFERS)) return null
  if (action.type === ACTION_TOWN_LEAVE) return leaveEncounter(prevState, 'town')

  const town = getCellAt(prevState.world, prevState.player.position) as TownCell
  return TOWN_OFFERS[action.type as TownOfferKind].reduce(prevState, town)
}

function reduceTownBuyFood(prevState: State, town: TownCell): State {
  const prefix = townPrefix(town)
  if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
    return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE)
  }

  const result = buy(prevState.resources, { gold: town.prices.foodGold, gain: { food: town.bundles.food } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, town.id)

  const clamped = applyFoodCapOnGain(prevState.resources, result.resources)
  const appliedFoodDelta = clamped.food - prevState.resources.food
  const deltas = result.deltas.map((d) => (d.target === 'food' ? { ...d, delta: appliedFoodDelta } : d))

  const pick = RNG.createRunCopyRandom(prevState).advanceCursor('town.buyFeedback', TOWN_BUY_LINES)
  return applyDeltas(prevState, {
    resources: clamped,
    run: pick.nextState.run,
    message: `${prefix}\n${pick.line}`,
    deltas,
  })
}

function reduceTownBuyTroops(prevState: State, town: TownCell): State {
  const prefix = townPrefix(town)
  const result = buy(prevState.resources, { gold: town.prices.troopsGold, gain: { armySize: town.bundles.troops } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, town.id)

  const pick = RNG.createRunCopyRandom(prevState).advanceCursor('town.buyFeedback', TOWN_BUY_LINES)
  return applyDeltas(prevState, {
    resources: result.resources,
    run: pick.nextState.run,
    message: `${prefix}\n${pick.line}`,
    deltas: result.deltas,
  })
}

function reduceTownHireScout(prevState: State, town: TownCell): State {
  const prefix = townPrefix(town)
  const rnd = RNG.createRunCopyRandom(prevState)

  if (prevState.resources.party.includes('scout')) {
    return setEncounterMessage(prevState, prefix, rnd.perMoveLine(TOWN_SCOUT_ALREADY_HAVE_LINES, { cellId: town.id }))
  }

  const result = buy(prevState.resources, { gold: town.prices.scoutGold, gain: { party: ['scout'] } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, town.id)

  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${prefix}\n${rnd.perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: town.id })}`,
    deltas: result.deltas,
  })
}

// ---- Worldgen placement ----

// The first town never omits `hireScout` so the hero is guaranteed a place to
// buy a scout early. Subsequent towns drop one of the base offers at random.
const placeNamedTowns: PlaceWorldProvider = ({ cells, rngState }) => {
  const omittableOffers = BASE_OFFERS.filter((o) => o !== ACTION_TOWN_HIRE_SCOUT)

  let townIndex = 0

  const next = placeNamedFeature(cells, rngState, {
    count: TOWN_COUNT,
    namePool: TOWN_NAME_POOL,
    fallbackName: 'A Town',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      const pool = townIndex === 0 ? omittableOffers : BASE_OFFERS
      const omitOffer = pool[rng.intExclusive(pool.length)]!
      const offers = BASE_OFFERS.filter((o) => o !== omitOffer)

      const foodGold = rng.intInRange(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX)
      const troopsGold = rng.intInRange(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX)
      const scoutGold = rng.intInRange(TOWN_PRICE_SCOUT_MIN, TOWN_PRICE_SCOUT_MAX)
      const rumorGold = rng.intInRange(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX)

      const cell: Cell = {
        kind: 'town',
        id: cellId(x, y),
        name,
        offers,
        prices: { foodGold, troopsGold, scoutGold, rumorGold },
        bundles: { food: TOWN_FOOD_BUNDLE, troops: TOWN_TROOPS_BUNDLE },
      }
      townIndex++
      return cell
    },
  })
  return { rngState: next }
}

// ---- Preview plate ----

function townOfferSlot(s: State, idx: number): RightGridActionCell | null {
  const town = getCellAt(s.world, s.player.position) as TownCell
  const o = town.offers[idx]
  return o ? gridButton(TOWN_OFFERS, o) : null
}

const townPreviewPlate: PreviewPlateProvider = (s) => {
  const here = getCellAt(s.world, s.player.position)
  if (!here || here.kind !== 'town') return null
  if (!here.offers.length) return null
  return here.offers.map((o) => {
    const spec = TOWN_OFFERS[o]
    return { spriteId: spec.spriteId, text: `-${here.prices[spec.priceKey]}` }
  })
}

function reduceTownBuyRumor(prevState: State, town: TownCell): State {
  const prefix = townPrefix(town)
  const result = buy(prevState.resources, { gold: town.prices.rumorGold, gain: {} })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, town.id)

  const pool = rumorPool()
  const pick = RNG.createRunCopyRandom(prevState).advanceCursor(`town.rumor.${town.id}`, pool, { salt: town.id })
  return applyDeltas(prevState, {
    resources: result.resources,
    run: pick.nextState.run,
    message: `${prefix}\n${pick.line}`,
    deltas: result.deltas,
  })
}

// ---- Mechanic registration ----

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
    previewPlate: townPreviewPlate,
    previewEncounter: previewEncounterProvider('town'),
    rightGrid: makeRightGrid({
      leaveAction: { type: ACTION_TOWN_LEAVE },
      centerSpriteId: SPRITES.centers.marketStall,
      top: (s) => townOfferSlot(s, 0),
      left: (s) => townOfferSlot(s, 1),
      bottom: (s) => townOfferSlot(s, 2),
    }),
  },
}
