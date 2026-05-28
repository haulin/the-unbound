import {
  FARM_BEAST_GOLD_MAX,
  FARM_BEAST_GOLD_MIN,
  FARM_BUY_FOOD_AMOUNT,
  FARM_BUY_FOOD_GOLD_COST,
  FARM_COUNT,
  FARM_NAME_POOL,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { foodCarryCap, FOOD_CARRY_FULL_MESSAGE, resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
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

export const ACTION_FARM_BUY_FOOD = 'FARM_BUY_FOOD' as const
export const ACTION_FARM_BUY_BEAST = 'FARM_BUY_BEAST' as const
export const ACTION_FARM_LEAVE = 'FARM_LEAVE' as const
export type FarmAction =
  | { type: typeof ACTION_FARM_BUY_FOOD }
  | { type: typeof ACTION_FARM_BUY_BEAST }
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
  const lines: PreviewPlateLine[] = [
    { spriteId: SPRITES.stats.food, text: `-${FARM_BUY_FOOD_GOLD_COST}` },
    { spriteId: SPRITES.cosmetics.beastIllustration, text: `-${here.beastGoldCost}` },
  ]
  return lines
}

function reduceFarmBuyBeast(prevState: State, farm: FarmCell): State {
  const prefix = farmPrefix(farm)
  const rnd = RNG.createRunCopyRandom(prevState)

  if (prevState.resources.hasTameBeast) {
    return setEncounterMessage(prevState, prefix, rnd.perMoveLine(MULE_ALREADY_LINES, { cellId: farm.id }))
  }

  const result = buy(prevState.resources, { gold: farm.beastGoldCost, gain: { hasTameBeast: true } })
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
    previewEncounter: (): FarmEncounter => ({ kind: 'farm', sourceCellId: -1, restoreMessage: '' }),
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
  },
}
