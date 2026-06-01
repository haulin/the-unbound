import {
  CAMP_COOLDOWN_MOVES,
  CAMP_COUNT,
  CAMP_EMPTY_LINES,
  CAMP_FOOD_GAIN,
  CAMP_NAME_POOL,
  CAMP_RECRUIT_LINES,
} from '../../constants'
import { cellIdForPos, getCellAt, setCellAt } from '../../cells'
import { applyFoodCapOnGain } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CampCell, CampEncounter, Resources, State } from '../../types'
import {
  applyDeltas,
  gridButton,
  leaveEncounter,
  makeRightGrid,
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

export const ACTION_CAMP_SEARCH = 'CAMP_SEARCH' as const
export const ACTION_CAMP_LEAVE = 'CAMP_LEAVE' as const

type CampActionSpec = { spriteId: number; reduce: (s: State) => State }

const CAMP_ACTIONS = {
  [ACTION_CAMP_SEARCH]: { spriteId: SPRITES.actions.search, reduce: reduceCampSearch },
} as const satisfies Record<string, CampActionSpec>

export type CampAction =
  | { type: keyof typeof CAMP_ACTIONS }
  | { type: typeof ACTION_CAMP_LEAVE }

// ---- Public helpers ----

export function computeCampArmyGain(args: { seed: number; campId: number; stepCount: number }): number {
  return RNG.keyedIntInRange({ seed: args.seed, stepCount: args.stepCount, cellId: args.campId }, 1, 2)
}

// ---- Worldgen placement ----

const placeNamedCamps: PlaceWorldProvider = ({ cells, rngState }) => {
  const next = placeNamedFeature(cells, rngState, {
    count: CAMP_COUNT,
    namePool: CAMP_NAME_POOL,
    fallbackName: 'A Camp',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name }) => ({ kind: 'camp', id: cellId(x, y), name, nextReadyStep: 0 }),
  })
  return { rngState: next }
}

const campPreviewPlate: PreviewPlateProvider = (s) => {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  const stepCount = s.run.stepCount
  if (stepCount < (camp.nextReadyStep ?? 0)) return null
  const armyGain = computeCampArmyGain({ seed: s.world.seed, campId: camp.id, stepCount })
  return [
    { spriteId: SPRITES.inventory.food, text: `+${CAMP_FOOD_GAIN}` },
    { spriteId: SPRITES.inventory.troop, text: `+${armyGain}` },
  ]
}

// ---- Encounter open ----

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

// ---- Encounter actions ----

const reduceCampAction: ReduceEncounterAction = (prevState, action) => {
  if (action.type !== ACTION_CAMP_LEAVE && !(action.type in CAMP_ACTIONS)) return null
  if (action.type === ACTION_CAMP_LEAVE) return leaveEncounter(prevState, 'camp')
  return CAMP_ACTIONS[action.type as keyof typeof CAMP_ACTIONS].reduce(prevState)
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

// ---- Mechanic registration ----

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
      left: gridButton(CAMP_ACTIONS, ACTION_CAMP_SEARCH),
    }),
  },
}
