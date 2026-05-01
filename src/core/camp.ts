import { pickIntInRange } from './prng'
import {
  ACTION_CAMP_HIRE_SCOUT,
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  CAMP_COOLDOWN_MOVES,
  CAMP_EMPTY_LINES,
  CAMP_FOOD_GAIN,
  CAMP_RECRUIT_LINES,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  SCOUT_ALREADY_HAVE_LINES,
  SCOUT_FOOD_COST,
  SCOUT_HIRE_LINES,
  SCOUT_NO_FOOD_LINES,
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
  const scoutFoodCost = s.resources.hasScout ? null : SCOUT_FOOD_COST

  return { campName, foodGain, armyGain, scoutFoodCost }
}

export function reduceCampAction(prevState: State, action: Action): State | null {
  if (action.type !== ACTION_CAMP_LEAVE && action.type !== ACTION_CAMP_SEARCH && action.type !== ACTION_CAMP_HIRE_SCOUT) return null

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
    return { ...prevState, encounter: null, ui: { ...prevState.ui, message: restore } }
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
      kind: 'foodDelta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { delta: CAMP_FOOD_GAIN },
    })
    uiWith = enqueueAnim(uiWith, {
      kind: 'armyDelta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { delta: armyGain },
    })
    return { ...prevState, world: nextWorld, resources: nextResources, ui: uiWith }
  }

  if (prevRes.hasScout) {
    const line = pickDeterministicLine(SCOUT_ALREADY_HAVE_LINES, prevState.world.seed, campCell.id, stepCount)
    return { ...prevState, ui: { ...prevState.ui, message: `${campName} Camp\n${line}` } }
  }
  if (prevRes.food < SCOUT_FOOD_COST) {
    const line = pickDeterministicLine(SCOUT_NO_FOOD_LINES, prevState.world.seed, campCell.id, stepCount)
    return { ...prevState, ui: { ...prevState.ui, message: `${campName} Camp\n${line}` } }
  }

  const nextResources: Resources = { ...prevRes, hasScout: true, food: prevRes.food - SCOUT_FOOD_COST }
  const line = pickDeterministicLine(SCOUT_HIRE_LINES, prevState.world.seed, campCell.id, stepCount)
  const baseUi: Ui = { ...prevState.ui, message: `${campName} Camp\n${line}` }
  if (!ENABLE_ANIMATIONS) return { ...prevState, resources: nextResources, ui: baseUi }

  const startFrame = baseUi.clock.frame
  const uiWith = enqueueAnim(baseUi, {
    kind: 'foodDelta',
    startFrame,
    durationFrames: FOOD_DELTA_FRAMES,
    blocksInput: false,
    params: { delta: -SCOUT_FOOD_COST },
  })
  return { ...prevState, resources: nextResources, ui: uiWith }
}

