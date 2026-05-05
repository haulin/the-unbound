import {
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  CAMP_COOLDOWN_MOVES,
  CAMP_EMPTY_LINES,
  CAMP_FOOD_GAIN,
  CAMP_RECRUIT_LINES,
} from '../../constants'
import { cellIdForPos, getCellAt, setCellAt } from '../../cells'
import { resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CampCell, CampEncounter, Resources, State } from '../../types'
import {
  applyDeltas,
  leaveEncounter,
  setEncounterMessage,
} from '../encounterHelpers'
import type { MechanicDef, OnEnterTile, ReduceEncounterAction, TileEnterResult } from '../types'

// ---- Public helpers ----

export function computeCampArmyGain(args: { seed: number; campId: number; stepCount: number }): number {
  return RNG.keyedIntInRange({ seed: args.seed, stepCount: args.stepCount, cellId: args.campId }, 1, 2)
}

export type CampPreviewModel = {
  campName: string
  foodGain: number
  armyGain: number
  scoutFoodCost: number | null
}

export function computeCampPreviewModel(s: State): CampPreviewModel {
  const camp = getCellAt(s.world, s.player.position) as CampCell
  const campName = camp.name || 'A Camp'
  const stepCount = s.run.stepCount
  const readyAt = camp.nextReadyStep ?? 0
  const isReady = stepCount >= readyAt

  const foodGain = isReady ? CAMP_FOOD_GAIN : 0
  const armyGain = isReady ? computeCampArmyGain({ seed: s.world.seed, campId: camp.id, stepCount }) : 0
  const scoutFoodCost = null

  return { campName, foodGain, armyGain, scoutFoodCost }
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

// ---- Encounter actions: ACTION_CAMP_LEAVE / ACTION_CAMP_SEARCH ----

const reduceCampAction: ReduceEncounterAction = (prevState, action) => {
  if (action.type !== ACTION_CAMP_LEAVE && action.type !== ACTION_CAMP_SEARCH) return null

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'camp') return prevState

  if (action.type === ACTION_CAMP_LEAVE) return leaveEncounter(prevState, 'camp')

  return reduceCampSearch(prevState)
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
  const nextResources = resourcesWithClampedFoodIfNeeded(gained)
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
  encounterKind: 'camp',
  reduceEncounterAction: reduceCampAction,
  rightGrid: (_s, row, col) => {
    if (row === 0 && col === 1) return { action: null } // North disabled
    if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.search, action: { type: ACTION_CAMP_SEARCH } }
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_CAMP_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.campfireIcon, action: null }
    return { action: null }
  },
}
