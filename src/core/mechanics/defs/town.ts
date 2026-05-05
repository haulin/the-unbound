import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
  BARKEEP_TIPS,
  TOWN_BUY_LINES,
  TOWN_ENTER_LINES,
  TOWN_SCOUT_ALREADY_HAVE_LINES,
  TOWN_SCOUT_HIRE_LINES,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { foodCarryCap, FOOD_CARRY_FULL_MESSAGE, resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { State, TownCell, TownEncounter, TownOfferKind } from '../../types'
import {
  applyDeltas,
  buy,
  leaveEncounter,
  noGoldResponse,
  setEncounterMessage,
} from '../encounterHelpers'
import type { MechanicDef, OnEnterTile, ReduceEncounterAction, TileEnterResult } from '../types'

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
  encounterKind: 'town',
  reduceEncounterAction: reduceTownAction,
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
}
