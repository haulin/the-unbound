import {
  FARM_BEAST_GOLD_MAX,
  FARM_BEAST_GOLD_MIN,
  FARM_BUY_FOOD_AMOUNT,
  FARM_BUY_FOOD_GOLD_COST,
  FARM_COUNT,
  FARM_NAME_POOL,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { applyFoodCapOnGain, foodCarryCap, FOOD_CARRY_FULL_MESSAGE } from '../../foodCarry'
import {
  MULE_ALREADY_LINES,
  MULE_BUY_LINES,
  FARM_BUY_FOOD_LINES,
  FARM_ENTER_LINES,
} from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { FarmCell, FarmEncounter, State } from '../../types'
import {
  applyDeltas,
  buy,
  gridButton,
  leaveEncounter,
  makeRightGrid,
  noGoldResponse,
  previewEncounterProvider,
  setEncounterMessage,
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

export const ACTION_FARM_BUY_FOOD = 'FARM_BUY_FOOD' as const
export const ACTION_FARM_BUY_BEAST = 'FARM_BUY_BEAST' as const
export const ACTION_FARM_LEAVE = 'FARM_LEAVE' as const

type FarmActionSpec = { spriteId: number; reduce: (s: State, farm: FarmCell) => State }

const FARM_ACTIONS = {
  [ACTION_FARM_BUY_FOOD]:  { spriteId: SPRITES.inventory.food,  reduce: reduceFarmBuyFood  },
  [ACTION_FARM_BUY_BEAST]: { spriteId: SPRITES.inventory.beast, reduce: reduceFarmBuyBeast },
} as const satisfies Record<string, FarmActionSpec>

export type FarmAction =
  | { type: keyof typeof FARM_ACTIONS }
  | { type: typeof ACTION_FARM_LEAVE }

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
  if (action.type !== ACTION_FARM_LEAVE && !(action.type in FARM_ACTIONS)) return null
  if (action.type === ACTION_FARM_LEAVE) return leaveEncounter(prevState, 'farm')

  const farm = getCellAt(prevState.world, prevState.player.position) as FarmCell
  return FARM_ACTIONS[action.type as keyof typeof FARM_ACTIONS].reduce(prevState, farm)
}

function reduceFarmBuyFood(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
    return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE)
  }

  const result = buy(prevState.resources, { gold: FARM_BUY_FOOD_GOLD_COST, gain: { food: FARM_BUY_FOOD_AMOUNT } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, farm.id)

  const clamped = applyFoodCapOnGain(prevState.resources, result.resources)
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

// ---- Worldgen placement ----

const placeNamedFarms: PlaceWorldProvider = ({ cells, rngState }) => {
  const next = placeNamedFeature(cells, rngState, {
    count: FARM_COUNT,
    namePool: FARM_NAME_POOL,
    fallbackName: 'A Farm',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      const beastGoldCost = rng.intInRange(FARM_BEAST_GOLD_MIN, FARM_BEAST_GOLD_MAX)
      return { kind: 'farm', id: cellId(x, y), name, beastGoldCost }
    },
  })
  return { rngState: next }
}

// ---- Preview plate ----

const farmPreviewPlate: PreviewPlateProvider = (s) => {
  const here = getCellAt(s.world, s.player.position)
  if (!here || here.kind !== 'farm') return null
  return [
    { spriteId: FARM_ACTIONS[ACTION_FARM_BUY_FOOD].spriteId, text: `-${FARM_BUY_FOOD_GOLD_COST}` },
    { spriteId: FARM_ACTIONS[ACTION_FARM_BUY_BEAST].spriteId, text: `-${here.beastGoldCost}` },
  ]
}

function reduceFarmBuyBeast(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  const rnd = RNG.createRunCopyRandom(prevState)

  if (prevState.resources.party.includes('mule')) {
    return setEncounterMessage(prevState, prefix, rnd.perMoveLine(MULE_ALREADY_LINES, { cellId: farm.id }))
  }

  const result = buy(prevState.resources, { gold: farm.beastGoldCost, gain: { party: ['mule'] } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, prefix, farm.id)

  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${prefix}\n${rnd.perMoveLine(MULE_BUY_LINES, { cellId: farm.id })}`,
    deltas: result.deltas,
  })
}

// ---- Mechanic registration ----

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
      top: gridButton(FARM_ACTIONS, ACTION_FARM_BUY_FOOD),
      left: gridButton(FARM_ACTIONS, ACTION_FARM_BUY_BEAST),
    }),
  },
}
