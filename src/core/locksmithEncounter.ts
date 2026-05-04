import {
  ACTION_LOCKSMITH_LEAVE,
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  TOWN_NO_GOLD_LINES,
} from './constants'
import {
  LOCKSMITH_NAME,
  LOCKSMITH_NO_FOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
} from './lore'
import { RNG } from './rng'
import { enqueueAnim, enqueueGridTransition } from './uiAnim'
import type { Action, Resources, State, Ui } from './types'

export function reduceLocksmithAction(prevState: State, action: Action): State | null {
  if (
    action.type !== ACTION_LOCKSMITH_PAY_GOLD &&
    action.type !== ACTION_LOCKSMITH_PAY_FOOD &&
    action.type !== ACTION_LOCKSMITH_LEAVE
  ) {
    return null
  }

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'locksmith') return prevState

  const rnd = RNG.createRunCopyRandom(prevState)
  const prevRes = prevState.resources

  const setMessage = (line: string) => ({
    ...prevState,
    ui: { ...prevState.ui, message: `${LOCKSMITH_NAME}\n${line}` },
  })

  if (action.type === ACTION_LOCKSMITH_LEAVE) {
    const restore = enc.restoreMessage
    const baseUi: Ui = { ...prevState.ui, message: restore }
    if (!ENABLE_ANIMATIONS) return { ...prevState, encounter: null, ui: baseUi }
    const uiWith = enqueueGridTransition(baseUi, { from: 'locksmith', to: 'overworld' })
    return { ...prevState, encounter: null, ui: uiWith }
  }

  if (prevRes.hasBronzeKey) {
    return setMessage(rnd.perMoveLine(LOCKSMITH_VISITED_LINES))
  }

  if (action.type === ACTION_LOCKSMITH_PAY_GOLD) {
    if (prevRes.gold < LOCKSMITH_KEY_GOLD_COST) {
      return setMessage(rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: enc.sourceCellId }))
    }

    const nextResources: Resources = {
      ...prevRes,
      gold: prevRes.gold - LOCKSMITH_KEY_GOLD_COST,
      hasBronzeKey: true,
    }

    const line = rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)
    const baseUi: Ui = { ...prevState.ui, message: `${LOCKSMITH_NAME}\n${line}` }
    if (!ENABLE_ANIMATIONS) {
      return { ...prevState, resources: nextResources, ui: baseUi }
    }

    const startFrame = baseUi.clock.frame
    const uiWith = enqueueAnim(baseUi, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'gold', delta: -LOCKSMITH_KEY_GOLD_COST },
    })
    return { ...prevState, resources: nextResources, ui: uiWith }
  }

  // ACTION_LOCKSMITH_PAY_FOOD
  if (prevRes.food < LOCKSMITH_KEY_FOOD_COST) {
    return setMessage(rnd.perMoveLine(LOCKSMITH_NO_FOOD_LINES))
  }

  const nextResources: Resources = {
    ...prevRes,
    food: prevRes.food - LOCKSMITH_KEY_FOOD_COST,
    hasBronzeKey: true,
  }

  const line = rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)
  const baseUi: Ui = { ...prevState.ui, message: `${LOCKSMITH_NAME}\n${line}` }
  if (!ENABLE_ANIMATIONS) {
    return { ...prevState, resources: nextResources, ui: baseUi }
  }

  const startFrame = baseUi.clock.frame
  const uiWith = enqueueAnim(baseUi, {
    kind: 'delta',
    startFrame,
    durationFrames: FOOD_DELTA_FRAMES,
    blocksInput: false,
    params: { target: 'food', delta: -LOCKSMITH_KEY_FOOD_COST },
  })
  return { ...prevState, resources: nextResources, ui: uiWith }
}
