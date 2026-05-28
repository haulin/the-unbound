import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
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
import { foodCarryCap, FOOD_CARRY_FULL_MESSAGE, resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Cell, State, TownCell, TownEncounter, TownOfferKind } from '../../types'
import {
  applyDeltas,
  buy,
  leaveEncounter,
  noGoldResponse,
  setEncounterMessage,
} from '../encounterHelpers'
import { cellId, isTerrainCell, placeNamedFeature } from '../../worldgen'
import type {
  MechanicDef,
  OnEnterTile,
  PlaceWorldProvider,
  PreviewPlateLine,
  PreviewPlateProvider,
  ReduceEncounterAction,
  TileEnterResult,
} from '../types'

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
  if (
    action.type !== ACTION_TOWN_BUY_FOOD &&
    action.type !== ACTION_TOWN_BUY_TROOPS &&
    action.type !== ACTION_TOWN_HIRE_SCOUT &&
    action.type !== ACTION_TOWN_BUY_RUMOR &&
    action.type !== ACTION_TOWN_LEAVE
  ) {
    return null
  }

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'town') return prevState

  if (action.type === ACTION_TOWN_LEAVE) return leaveEncounter(prevState, 'town')

  const town = getCellAt(prevState.world, prevState.player.position) as TownCell

  if (action.type === ACTION_TOWN_BUY_FOOD) return reduceTownBuyFood(prevState, town)
  if (action.type === ACTION_TOWN_BUY_TROOPS) return reduceTownBuyTroops(prevState, town)
  if (action.type === ACTION_TOWN_HIRE_SCOUT) return reduceTownHireScout(prevState, town)
  return reduceTownBuyRumor(prevState, town)
}

function reduceTownBuyFood(prevState: State, town: TownCell): State {
  const prefix = townPrefix(town)
  if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
    return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE)
  }

  const result = buy(prevState.resources, { gold: town.prices.foodGold, gain: { food: town.bundles.food } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, town.id)

  const clamped = resourcesWithClampedFoodIfNeeded(result.resources)
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

  if (prevState.resources.hasScout) {
    return setEncounterMessage(prevState, prefix, rnd.perMoveLine(TOWN_SCOUT_ALREADY_HAVE_LINES, { cellId: town.id }))
  }

  const result = buy(prevState.resources, { gold: town.prices.scoutGold, gain: { hasScout: true } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, town.id)

  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${prefix}\n${rnd.perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: town.id })}`,
    deltas: result.deltas,
  })
}

// ---- Worldgen placement ----

// The first town never omits `hireScout` so the hero is guaranteed a place to
// buy a scout early. Subsequent towns drop one of the four base offers at
// random.
const placeNamedTowns: PlaceWorldProvider = ({ cells, rngState }) => {
  const baseOffers: TownOfferKind[] = [
    ACTION_TOWN_BUY_FOOD,
    ACTION_TOWN_BUY_TROOPS,
    ACTION_TOWN_HIRE_SCOUT,
    ACTION_TOWN_BUY_RUMOR,
  ]
  const omitNoScoutIndices = [0, 1, 3] as const

  let townIndex = 0

  const next = placeNamedFeature(cells, rngState, {
    count: TOWN_COUNT,
    namePool: TOWN_NAME_POOL,
    fallbackName: 'A Town',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      let omitIdx: number
      if (townIndex === 0) {
        const idx = rng.intExclusive(omitNoScoutIndices.length)
        omitIdx = omitNoScoutIndices[idx]!
      } else {
        omitIdx = rng.intExclusive(baseOffers.length)
      }
      const offers = baseOffers.filter((_k, idx) => idx !== omitIdx)

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

const townPreviewPlate: PreviewPlateProvider = (s) => {
  const here = getCellAt(s.world, s.player.position)
  if (!here || here.kind !== 'town') return null
  const lines: PreviewPlateLine[] = []
  for (let i = 0; i < here.offers.length; i++) {
    const o = here.offers[i]!
    if (o === 'buyFood') lines.push({ spriteId: SPRITES.stats.food, text: `-${here.prices.foodGold}` })
    else if (o === 'buyTroops') lines.push({ spriteId: SPRITES.stats.troop, text: `-${here.prices.troopsGold}` })
    else if (o === 'hireScout') lines.push({ spriteId: SPRITES.stats.scout, text: `-${here.prices.scoutGold}` })
    else if (o === 'buyRumors') lines.push({ spriteId: SPRITES.cosmetics.rumorIllustration, text: `-${here.prices.rumorGold}` })
  }
  return lines.length ? lines : null
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
    previewEncounter: (): TownEncounter => ({ kind: 'town', sourceCellId: -1, restoreMessage: '' }),
    rightGrid: (s, row, col) => {
      const town = getCellAt(s.world, s.player.position) as TownCell

      function spriteIdForOffer(o: TownOfferKind | undefined): number | null {
        if (!o) return null
        if (o === 'buyFood') return SPRITES.buttons.food
        if (o === 'buyTroops') return SPRITES.buttons.troop
        if (o === 'hireScout') return SPRITES.buttons.scout
        if (o === 'buyRumors') return SPRITES.buttons.rumorTip
        return null
      }

      const offerAt = (idx: number) => {
        const o = town.offers[idx]
        if (!o) return { action: null }
        const spriteId = spriteIdForOffer(o)
        if (spriteId == null) return { action: null }
        return { spriteId, action: { type: o } }
      }

      if (row === 0 && col === 1) return offerAt(0) // North
      if (row === 1 && col === 0) return offerAt(1) // West
      if (row === 2 && col === 1) return offerAt(2) // South
      if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_TOWN_LEAVE } }
      if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.marketStall, action: null }
      return { action: null }
    },
  },
}
