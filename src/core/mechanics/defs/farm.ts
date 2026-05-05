import {
  ACTION_FARM_BUY_BEAST,
  ACTION_FARM_BUY_FOOD,
  ACTION_FARM_LEAVE,
  FARM_BUY_FOOD_AMOUNT,
  FARM_BUY_FOOD_GOLD_COST,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { foodCarryCap, FOOD_CARRY_FULL_MESSAGE, resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
import {
  FARM_BEAST_ALREADY_LINES,
  FARM_BUY_BEAST_LINES,
  FARM_BUY_FOOD_LINES,
  FARM_ENTER_LINES,
} from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { FarmCell, FarmEncounter, State } from '../../types'
import {
  applyDeltas,
  buy,
  leaveEncounter,
  noGoldResponse,
  setEncounterMessage,
} from '../encounterHelpers'
import type { MechanicDef, OnEnterTile, ReduceEncounterAction, TileEnterResult } from '../types'

function farmPrefix(farm: FarmCell): string {
  const name = farm.name || 'A Farm'
  return `${name} Farm`
}

// ---- Encounter open ----

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

// ---- Encounter actions ----

const reduceFarmAction: ReduceEncounterAction = (prevState, action) => {
  if (
    action.type !== ACTION_FARM_BUY_FOOD &&
    action.type !== ACTION_FARM_BUY_BEAST &&
    action.type !== ACTION_FARM_LEAVE
  ) {
    return null
  }

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'farm') return prevState

  if (action.type === ACTION_FARM_LEAVE) return leaveEncounter(prevState, 'farm')

  const farm = getCellAt(prevState.world, prevState.player.position) as FarmCell

  if (action.type === ACTION_FARM_BUY_FOOD) return reduceFarmBuyFood(prevState, farm)
  return reduceFarmBuyBeast(prevState, farm)
}

function reduceFarmBuyFood(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
    return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE)
  }

  const result = buy(prevState.resources, { gold: FARM_BUY_FOOD_GOLD_COST, gain: { food: FARM_BUY_FOOD_AMOUNT } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, farm.id)

  const clamped = resourcesWithClampedFoodIfNeeded(result.resources)
  const appliedFoodDelta = clamped.food - prevState.resources.food
  const deltas = result.deltas.map((d) => (d.target === 'food' ? { ...d, delta: appliedFoodDelta } : d))

  const pick = RNG.createRunCopyRandom(prevState).advanceCursor('farm.buyFoodFeedback', FARM_BUY_FOOD_LINES)
  return applyDeltas(prevState, {
    resources: clamped,
    run: pick.nextState.run,
    message: `${prefix}\n${pick.line}`,
    deltas,
  })
}

function reduceFarmBuyBeast(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  const rnd = RNG.createRunCopyRandom(prevState)

  if (prevState.resources.hasTameBeast) {
    return setEncounterMessage(prevState, prefix, rnd.perMoveLine(FARM_BEAST_ALREADY_LINES, { cellId: farm.id }))
  }

  const result = buy(prevState.resources, { gold: farm.beastGoldCost, gain: { hasTameBeast: true } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, farm.id)

  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${prefix}\n${rnd.perMoveLine(FARM_BUY_BEAST_LINES, { cellId: farm.id })}`,
    deltas: result.deltas,
  })
}

// ---- Mechanic registration ----

export const farmMechanic: MechanicDef = {
  id: 'farm',
  kinds: ['farm'],
  mapLabel: 'F',
  onEnterTile: onEnterFarm,
  encounterKind: 'farm',
  reduceEncounterAction: reduceFarmAction,
  rightGrid: (_s, row, col) => {
    if (row === 0 && col === 1)
      return { spriteId: SPRITES.buttons.food, action: { type: ACTION_FARM_BUY_FOOD } }
    if (row === 1 && col === 0)
      return { spriteId: SPRITES.buttons.beast, action: { type: ACTION_FARM_BUY_BEAST } }
    if (row === 1 && col === 2)
      return { spriteId: SPRITES.buttons.return, action: { type: ACTION_FARM_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.farmBarn, action: null }
    return { action: null }
  },
}
