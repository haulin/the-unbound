import { pickIntInRange } from './prng'
import {
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  CAMP_COOLDOWN_MOVES,
  CAMP_EMPTY_LINES,
  CAMP_FOOD_GAIN,
  CAMP_RECRUIT_LINES,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  GRID_TRANSITION_STEP_FRAMES,
} from './constants'
import type { Action, CampCell, Resources, State, Ui } from './types'
import { pickDeterministicLine } from './tiles/poiUtils'
import { setCellAt } from './cells'
import { enqueueAnim } from './uiAnim'

export function computeCampArmyGain(args: { seed: number; campId: number; stepCount: number }): number {
  return pickIntInRange({ seed: args.seed, stepCount: args.stepCount, cellId: args.campId }, 1, 2)
}

export type CampPreviewModel = {
  campName: string
  foodGain: number
  armyGain: number
  scoutFoodCost: number | null
}

export function computeCampPreviewModel(s: State): CampPreviewModel | null {
  const pos = s.player.position
  const cell = s.world.cells[pos.y]![pos.x]!
  if (cell.kind !== 'camp') return null

  const camp = cell
  const campName = camp.name || 'A Camp'
  const stepCount = s.run.stepCount
  const readyAt = camp.nextReadyStep ?? 0
  const isReady = stepCount >= readyAt

  const foodGain = isReady ? CAMP_FOOD_GAIN : 0
  const armyGain = isReady ? computeCampArmyGain({ seed: s.world.seed, campId: camp.id, stepCount }) : 0
  const scoutFoodCost = null

  return { campName, foodGain, armyGain, scoutFoodCost }
}

function gridTransitionDurationFrames(): number {
  return Math.max(1, Math.trunc(GRID_TRANSITION_STEP_FRAMES)) * 5
}

export function reduceCampAction(prevState: State, action: Action): State | null {
  if (action.type !== ACTION_CAMP_LEAVE && action.type !== ACTION_CAMP_SEARCH) return null

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'camp') return prevState

  const pos = prevState.player.position
  const campCell = prevState.world.cells[pos.y]![pos.x]!
  if (campCell.kind !== 'camp') return prevState

  const campName = campCell.name || 'A Camp'
  const stepCount = prevState.run.stepCount
  const prevRes = prevState.resources

  if (action.type === ACTION_CAMP_LEAVE) {
    const restore = enc.restoreMessage
    const baseUi: Ui = { ...prevState.ui, message: restore }
    if (!ENABLE_ANIMATIONS) return { ...prevState, encounter: null, ui: baseUi }
    const startFrame = baseUi.clock.frame
    const uiWith = enqueueAnim(baseUi, {
      kind: 'gridTransition',
      startFrame,
      durationFrames: gridTransitionDurationFrames(),
      blocksInput: true,
      params: { from: 'camp', to: 'overworld' },
    })
    return { ...prevState, encounter: null, ui: uiWith }
  }

  if (action.type === ACTION_CAMP_SEARCH) {
    const readyAt = campCell.nextReadyStep ?? 0
    if (stepCount < readyAt) {
      const line = pickDeterministicLine(CAMP_EMPTY_LINES, prevState.world.seed, campCell.id, stepCount)
      return { ...prevState, ui: { ...prevState.ui, message: `${campName} Camp\n${line}` } }
    }

    const armyGain = computeCampArmyGain({ seed: prevState.world.seed, campId: campCell.id, stepCount })
    const nextCampCell: CampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES }
    const nextWorld = setCellAt(prevState.world, pos, nextCampCell)
    const nextResources: Resources = { ...prevRes, food: prevRes.food + CAMP_FOOD_GAIN, armySize: prevRes.armySize + armyGain }

    const line = pickDeterministicLine(CAMP_RECRUIT_LINES, prevState.world.seed, campCell.id, stepCount)
    const baseUi: Ui = { ...prevState.ui, message: `${campName} Camp\n${line}` }
    if (!ENABLE_ANIMATIONS) return { ...prevState, world: nextWorld, resources: nextResources, ui: baseUi }

    const startFrame = baseUi.clock.frame
    let uiWith = baseUi
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'food', delta: CAMP_FOOD_GAIN },
    })
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'army', delta: armyGain },
    })
    return { ...prevState, world: nextWorld, resources: nextResources, ui: uiWith }
  }

  return prevState
}

