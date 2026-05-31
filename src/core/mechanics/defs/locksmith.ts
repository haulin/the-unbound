import {
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  LOCKSMITH_LAIR_MIN_DISTANCE,
  TOWN_NO_GOLD_LINES,
} from '../../constants'
import { cellIdForPos, findCellByKind } from '../../cells'
import {
  LOCKSMITH_ENTER_LINES,
  LOCKSMITH_NAME,
  LOCKSMITH_NO_BLOOD_LINES,
  LOCKSMITH_NO_FOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
} from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { LocksmithEncounter, State } from '../../types'
import {
  applyDeltasAndClose,
  buy,
  gridButton,
  leaveEncounter,
  makeRightGrid,
  previewEncounterProvider,
  setEncounterMessage,
} from '../encounterHelpers'
import { isTerrainCell, placeFeature } from '../../worldgen'
import type {
  MechanicDef,
  OnEnterTile,
  PlaceWorldProvider,
  PreviewPlateProvider,
  ReduceEncounterAction,
  TileEnterResult,
} from '../types'

export const ACTION_LOCKSMITH_PAY_GOLD = 'LOCKSMITH_PAY_GOLD' as const
export const ACTION_LOCKSMITH_PAY_FOOD = 'LOCKSMITH_PAY_FOOD' as const
export const ACTION_LOCKSMITH_LEAVE = 'LOCKSMITH_LEAVE' as const

type LocksmithActionSpec = {
  spriteId: number
  reduce: (s: State, enc: LocksmithEncounter) => State
}

const LOCKSMITH_ACTIONS = {
  [ACTION_LOCKSMITH_PAY_GOLD]: { spriteId: SPRITES.inventory.gold, reduce: reduceLocksmithPayGold },
  [ACTION_LOCKSMITH_PAY_FOOD]: { spriteId: SPRITES.inventory.food, reduce: reduceLocksmithPayFood },
} as const satisfies Record<string, LocksmithActionSpec>

export type LocksmithAction =
  | { type: keyof typeof LOCKSMITH_ACTIONS }
  | { type: typeof ACTION_LOCKSMITH_LEAVE }

const onEnterLocksmith: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'locksmith') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (resources.inventory.includes('bronzeKey')) {
    const line = r.perMoveLine(LOCKSMITH_VISITED_LINES)
    return { message: `${LOCKSMITH_NAME}\n${line}` }
  }

  if (!resources.inventory.includes('blood')) {
    const line = r.perMoveLine(LOCKSMITH_NO_BLOOD_LINES)
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
  if (action.type !== ACTION_LOCKSMITH_LEAVE && !(action.type in LOCKSMITH_ACTIONS)) return null
  if (action.type === ACTION_LOCKSMITH_LEAVE) return leaveEncounter(prevState, 'locksmith')

  const enc = prevState.encounter as LocksmithEncounter
  return LOCKSMITH_ACTIONS[action.type as keyof typeof LOCKSMITH_ACTIONS].reduce(prevState, enc)
}

function reduceLocksmithPayGold(prevState: State, enc: LocksmithEncounter): State {
  const rnd = RNG.createRunCopyRandom(prevState)
  const result = buy(prevState.resources, { gold: LOCKSMITH_KEY_GOLD_COST, gain: { inventory: ['bronzeKey'] } })
  if (result.outcome === 'noFunds') {
    return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: enc.sourceCellId }))
  }
  return applyDeltasAndClose(prevState, {
    resources: consumeBlood(result.resources),
    message: `${LOCKSMITH_NAME}\n${rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)}`,
    deltas: result.deltas,
  }, 'locksmith')
}

// ---- Worldgen placement ----

const placeLocksmith: PlaceWorldProvider = ({ cells, rngState }) => {
  const lairPos = findCellByKind(cells, 'lair')
  if (!lairPos) throw new Error('placeLocksmith: wyrm lair must be placed before locksmith')
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    awayFrom: { pos: lairPos, minDistance: LOCKSMITH_LAIR_MIN_DISTANCE },
    buildCell: () => ({ kind: 'locksmith' }),
  })
  return { rngState: res.rngState }
}

// ---- Preview plate ----

const locksmithPreviewPlate: PreviewPlateProvider = () => [
  { spriteId: LOCKSMITH_ACTIONS[ACTION_LOCKSMITH_PAY_GOLD].spriteId, text: `-${LOCKSMITH_KEY_GOLD_COST}` },
  { spriteId: LOCKSMITH_ACTIONS[ACTION_LOCKSMITH_PAY_FOOD].spriteId, text: `-${LOCKSMITH_KEY_FOOD_COST}` },
]

function reduceLocksmithPayFood(prevState: State, _enc: LocksmithEncounter): State {
  const rnd = RNG.createRunCopyRandom(prevState)
  const result = buy(prevState.resources, { food: LOCKSMITH_KEY_FOOD_COST, gain: { inventory: ['bronzeKey'] } })
  if (result.outcome === 'noFunds') {
    return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_NO_FOOD_LINES))
  }
  return applyDeltasAndClose(prevState, {
    resources: consumeBlood(result.resources),
    message: `${LOCKSMITH_NAME}\n${rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)}`,
    deltas: result.deltas,
  }, 'locksmith')
}

function consumeBlood(resources: State['resources']): State['resources'] {
  if (!resources.inventory.includes('blood')) return resources
  return { ...resources, inventory: resources.inventory.filter((slot) => slot !== 'blood') }
}

// ---- Mechanic registration ----

export const locksmithMechanic: MechanicDef = {
  id: 'locksmith',
  kinds: ['locksmith'],
  mapLabel: 'L',
  onEnterTile: onEnterLocksmith,
  poiSignpost: {
    rank: 10,
    name: () => LOCKSMITH_NAME,
  },
  placeWorld: placeLocksmith,
  encounter: {
    kind: 'locksmith',
    reduceAction: reduceLocksmithAction,
    previewPlate: locksmithPreviewPlate,
    previewEncounter: previewEncounterProvider('locksmith'),
    rightGrid: makeRightGrid({
      leaveAction: { type: ACTION_LOCKSMITH_LEAVE },
      centerSpriteId: SPRITES.centers.locksmithKiln,
      top: gridButton(LOCKSMITH_ACTIONS, ACTION_LOCKSMITH_PAY_GOLD),
      left: gridButton(LOCKSMITH_ACTIONS, ACTION_LOCKSMITH_PAY_FOOD),
    }),
  },
}
