import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
  BARKEEP_TIPS,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  TOWN_BUY_LINES,
  TOWN_NO_GOLD_LINES,
  TOWN_SCOUT_ALREADY_HAVE_LINES,
  TOWN_SCOUT_HIRE_LINES,
} from './constants'
import type { Action, Resources, State, TownCell, Ui } from './types'
import { foodCarryCap, FOOD_CARRY_FULL_MESSAGE, resourcesWithClampedFoodIfNeeded } from './foodCarry'
import { RNG } from './rng'
import { enqueueAnim, enqueueGridTransition } from './uiAnim'

function getTownAtPlayer(s: State): TownCell | null {
  const p = s.player.position
  const cell = s.world.cells[p.y]![p.x]!
  return cell.kind === 'town' ? cell : null
}

function townPrefix(town: TownCell): string {
  const name = town.name || 'A Town'
  return `${name} Town`
}

function rumorPool(): readonly string[] {
  const pool: string[] = []

  const groups = Object.values(BARKEEP_TIPS) as Array<readonly string[]>
  for (let i = 0; i < groups.length; i++) {
    const lines = groups[i]!
    for (let j = 0; j < lines.length; j++) pool.push(lines[j]!)
  }
  return pool
}

export function reduceTownAction(prevState: State, action: Action): State | null {
  if (
    action.type !== ACTION_TOWN_BUY_FOOD &&
    action.type !== ACTION_TOWN_BUY_TROOPS &&
    action.type !== ACTION_TOWN_HIRE_SCOUT &&
    action.type !== ACTION_TOWN_BUY_RUMOR &&
    action.type !== ACTION_TOWN_LEAVE
  ) {
    return null
  }

  const enc = prevState.encounter
  if (!enc || enc.kind !== 'town') return prevState

  const town = getTownAtPlayer(prevState)
  if (!town) return prevState

  const townId = town.id
  const prefix = townPrefix(town)
  const rnd = RNG.createRunCopyRandom(prevState)

  const prevRes = prevState.resources

  const setMessage = (line: string) => ({ ...prevState, ui: { ...prevState.ui, message: `${prefix}\n${line}` } })
  const noGold = () => setMessage(rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: townId }))

  if (action.type === ACTION_TOWN_LEAVE) {
    const restore = enc.restoreMessage
    const baseUi: Ui = { ...prevState.ui, message: restore }
    if (!ENABLE_ANIMATIONS) return { ...prevState, encounter: null, ui: baseUi }
    const uiWith = enqueueGridTransition(baseUi, { from: 'town', to: 'overworld' })
    return { ...prevState, encounter: null, ui: uiWith }
  }

  if (action.type === ACTION_TOWN_BUY_FOOD) {
    const cap = foodCarryCap(prevRes)
    if (prevRes.food >= cap) {
      return setMessage(FOOD_CARRY_FULL_MESSAGE)
    }

    const cost = town.prices.foodGold
    if (prevRes.gold < cost) return noGold()

    const nextResourcesRaw: Resources = {
      ...prevRes,
      gold: prevRes.gold - cost,
      food: prevRes.food + town.bundles.food,
    }
    const nextResources = resourcesWithClampedFoodIfNeeded(nextResourcesRaw)
    const foodGain = nextResources.food - prevRes.food

    const pick = rnd.advanceCursor('town.buyFeedback', TOWN_BUY_LINES)
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
      params: { target: 'gold', delta: -cost },
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

  if (action.type === ACTION_TOWN_BUY_TROOPS) {
    const cost = town.prices.troopsGold
    if (prevRes.gold < cost) return noGold()

    const nextResources: Resources = {
      ...prevRes,
      gold: prevRes.gold - cost,
      armySize: prevRes.armySize + town.bundles.troops,
    }

    const pick = rnd.advanceCursor('town.buyFeedback', TOWN_BUY_LINES)
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
      params: { target: 'gold', delta: -cost },
    })
    uiWith = enqueueAnim(uiWith, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'army', delta: town.bundles.troops },
    })
    return { ...prevState, run: nextRun, resources: nextResources, ui: uiWith }
  }

  if (action.type === ACTION_TOWN_HIRE_SCOUT) {
    if (prevRes.hasScout) {
      return setMessage(rnd.perMoveLine(TOWN_SCOUT_ALREADY_HAVE_LINES, { cellId: townId }))
    }

    const cost = town.prices.scoutGold
    if (prevRes.gold < cost) return noGold()

    const nextResources: Resources = { ...prevRes, hasScout: true, gold: prevRes.gold - cost }
    const line = rnd.perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: townId })
    const baseUi: Ui = { ...prevState.ui, message: `${prefix}\n${line}` }
    if (!ENABLE_ANIMATIONS) return { ...prevState, resources: nextResources, ui: baseUi }

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

  // ACTION_TOWN_BUY_RUMOR
  const cost = town.prices.rumorGold
  if (prevRes.gold < cost) return noGold()

  const nextResources: Resources = { ...prevRes, gold: prevRes.gold - cost }
  const pool = rumorPool()
  const pick = rnd.advanceCursor(`town.rumor.${townId}`, pool, { salt: townId })
  const line = pick.line
  const nextRun = pick.nextState.run
  const baseUi: Ui = { ...prevState.ui, message: `${prefix}\n${line}` }
  if (!ENABLE_ANIMATIONS) return { ...prevState, run: nextRun, resources: nextResources, ui: baseUi }

  const startFrame = baseUi.clock.frame
  const uiWith = enqueueAnim(baseUi, {
    kind: 'delta',
    startFrame,
    durationFrames: FOOD_DELTA_FRAMES,
    blocksInput: false,
    params: { target: 'gold', delta: -cost },
  })
  return { ...prevState, run: nextRun, resources: nextResources, ui: uiWith }
}

