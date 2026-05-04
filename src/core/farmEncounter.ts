import {
  ACTION_FARM_BUY_BEAST,
  ACTION_FARM_BUY_FOOD,
  ACTION_FARM_LEAVE,
  ENABLE_ANIMATIONS,
  FARM_BUY_FOOD_AMOUNT,
  FARM_BUY_FOOD_GOLD_COST,
  FOOD_DELTA_FRAMES,
  TOWN_NO_GOLD_LINES,
} from './constants'
import { FARM_BEAST_ALREADY_LINES, FARM_BUY_BEAST_LINES, FARM_BUY_FOOD_LINES } from './lore'
import { foodCarryCap, FOOD_CARRY_FULL_MESSAGE, resourcesWithClampedFoodIfNeeded } from './foodCarry'
import { RNG } from './rng'
import { enqueueAnim, enqueueGridTransition } from './uiAnim'
import type { Action, FarmCell, Resources, State, Ui } from './types'

function getFarmAtPlayer(s: State): FarmCell | null {
  const p = s.player.position
  const cell = s.world.cells[p.y]![p.x]!
  return cell.kind === 'farm' ? cell : null
}

function farmPrefix(farm: FarmCell): string {
  const name = farm.name || 'A Farm'
  return `${name} Farm`
}

export function reduceFarmAction(prevState: State, action: Action): State | null {
  if (
    action.type !== ACTION_FARM_BUY_FOOD &&
    action.type !== ACTION_FARM_BUY_BEAST &&
    action.type !== ACTION_FARM_LEAVE
  ) {
    return null
  }

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'farm') return prevState

  const farm = getFarmAtPlayer(prevState)
  if (!farm) return prevState

  const farmId = farm.id
  const prefix = farmPrefix(farm)
  const rnd = RNG.createRunCopyRandom(prevState)

  const prevRes = prevState.resources

  const setMessage = (line: string) => ({ ...prevState, ui: { ...prevState.ui, message: `${prefix}\n${line}` } })
  const noGold = () => setMessage(rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: farmId }))

  if (action.type === ACTION_FARM_LEAVE) {
    const restore = enc.restoreMessage
    const baseUi: Ui = { ...prevState.ui, message: restore }
    if (!ENABLE_ANIMATIONS) return { ...prevState, encounter: null, ui: baseUi }
    const uiWith = enqueueGridTransition(baseUi, { from: 'farm', to: 'overworld' })
    return { ...prevState, encounter: null, ui: uiWith }
  }

  if (action.type === ACTION_FARM_BUY_FOOD) {
    const cap = foodCarryCap(prevRes)
    if (prevRes.food >= cap) {
      return setMessage(FOOD_CARRY_FULL_MESSAGE)
    }

    if (prevRes.gold < FARM_BUY_FOOD_GOLD_COST) return noGold()

    const nextResourcesRaw: Resources = {
      ...prevRes,
      gold: prevRes.gold - FARM_BUY_FOOD_GOLD_COST,
      food: prevRes.food + FARM_BUY_FOOD_AMOUNT,
    }
    const nextResources = resourcesWithClampedFoodIfNeeded(nextResourcesRaw)
    const foodGain = nextResources.food - prevRes.food

    const pick = rnd.advanceCursor('farm.buyFoodFeedback', FARM_BUY_FOOD_LINES)
    const nextRun = pick.nextState.run
    const line = pick.line
    const baseUi: Ui = { ...prevState.ui, message: `${prefix}\n${line}` }
    if (!ENABLE_ANIMATIONS) return { ...prevState, run: nextRun, resources: nextResources, ui: baseUi }

    const startFrame = baseUi.clock.frame
    let uiWith = baseUi
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'gold', delta: -FARM_BUY_FOOD_GOLD_COST },
    })
    if (foodGain) {
      uiWith = enqueueAnim(uiWith, {
        kind: 'delta',
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: 'food', delta: foodGain },
      })
    }
    return { ...prevState, run: nextRun, resources: nextResources, ui: uiWith }
  }

  if (prevRes.hasTameBeast) {
    return setMessage(rnd.perMoveLine(FARM_BEAST_ALREADY_LINES, { cellId: farmId }))
  }

  const cost = farm.beastGoldCost
  if (prevRes.gold < cost) return noGold()

  const nextResources: Resources = {
    ...prevRes,
    gold: prevRes.gold - cost,
    hasTameBeast: true,
  }

  const line = rnd.perMoveLine(FARM_BUY_BEAST_LINES, { cellId: farmId })
  const baseUi: Ui = { ...prevState.ui, message: `${prefix}\n${line}` }
  if (!ENABLE_ANIMATIONS) {
    return { ...prevState, resources: nextResources, ui: baseUi }
  }

  const startFrame = baseUi.clock.frame
  const uiWith = enqueueAnim(baseUi, {
    kind: 'delta',
    startFrame,
    durationFrames: FOOD_DELTA_FRAMES,
    blocksInput: false,
    params: { target: 'gold', delta: -cost },
  })
  return { ...prevState, resources: nextResources, ui: uiWith }
}
