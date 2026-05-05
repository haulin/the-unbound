import {
  ACTION_LOCKSMITH_LEAVE,
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  TOWN_NO_GOLD_LINES,
} from '../../constants'
import { cellIdForPos } from '../../cells'
import {
  LOCKSMITH_ENTER_LINES,
  LOCKSMITH_NAME,
  LOCKSMITH_NO_FOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
} from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { LocksmithEncounter, State } from '../../types'
import { applyDeltas, buy, leaveEncounter, setEncounterMessage } from '../encounterHelpers'
import type { MechanicDef, OnEnterTile, ReduceEncounterAction, TileEnterResult } from '../types'

const onEnterLocksmith: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'locksmith') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (resources.hasBronzeKey) {
    const line = r.perMoveLine(LOCKSMITH_VISITED_LINES)
    return { message: `${LOCKSMITH_NAME}\n${line}` }
  }

  const line = r.stableLine(LOCKSMITH_ENTER_LINES)
  const message = `${LOCKSMITH_NAME}\n${line}`
  const cellId = cellIdForPos(world, pos)
  const encounter: LocksmithEncounter = {
    kind: 'locksmith',
    sourceCellId: cellId,
    restoreMessage: message,
  }
  const result: TileEnterResult = {
    message,
    encounter,
    enterAnims: [{ kind: 'gridTransition', from: 'overworld', to: 'locksmith' }],
  }
  return result
}

// ---- Encounter actions ----

const reduceLocksmithAction: ReduceEncounterAction = (prevState, action) => {
  if (
    action.type !== ACTION_LOCKSMITH_PAY_GOLD &&
    action.type !== ACTION_LOCKSMITH_PAY_FOOD &&
    action.type !== ACTION_LOCKSMITH_LEAVE
  ) {
    return null
  }

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'locksmith') return prevState

  if (action.type === ACTION_LOCKSMITH_LEAVE) return leaveEncounter(prevState, 'locksmith')

  if (action.type === ACTION_LOCKSMITH_PAY_GOLD) return reduceLocksmithPayGold(prevState, enc.sourceCellId)
  return reduceLocksmithPayFood(prevState)
}

function reduceLocksmithPayGold(prevState: State, sourceCellId: number): State {
  const rnd = RNG.createRunCopyRandom(prevState)
  const result = buy(prevState.resources, { gold: LOCKSMITH_KEY_GOLD_COST, gain: { hasBronzeKey: true } })
  if (result.outcome === 'noFunds') {
    return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: sourceCellId }))
  }
  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${LOCKSMITH_NAME}\n${rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)}`,
    deltas: result.deltas,
  })
}

function reduceLocksmithPayFood(prevState: State): State {
  const rnd = RNG.createRunCopyRandom(prevState)
  const result = buy(prevState.resources, { food: LOCKSMITH_KEY_FOOD_COST, gain: { hasBronzeKey: true } })
  if (result.outcome === 'noFunds') {
    return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_NO_FOOD_LINES))
  }
  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${LOCKSMITH_NAME}\n${rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)}`,
    deltas: result.deltas,
  })
}

// ---- Mechanic registration ----

export const locksmithMechanic: MechanicDef = {
  id: 'locksmith',
  kinds: ['locksmith'],
  mapLabel: 'L',
  onEnterTile: onEnterLocksmith,
  encounterKind: 'locksmith',
  reduceEncounterAction: reduceLocksmithAction,
  rightGrid: (_s, row, col) => {
    if (row === 0 && col === 1)
      return { spriteId: SPRITES.buttons.gold, action: { type: ACTION_LOCKSMITH_PAY_GOLD } }
    if (row === 1 && col === 0)
      return { spriteId: SPRITES.buttons.food, action: { type: ACTION_LOCKSMITH_PAY_FOOD } }
    if (row === 1 && col === 2)
      return { spriteId: SPRITES.buttons.return, action: { type: ACTION_LOCKSMITH_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.locksmithKiln, action: null }
    return { action: null }
  },
}
