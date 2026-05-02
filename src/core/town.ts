import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
  BARKEEP_TIPS,
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  GRID_TRANSITION_STEP_FRAMES,
  TOWN_BUY_LINES,
  TOWN_NO_GOLD_LINES,
  TOWN_SCOUT_ALREADY_HAVE_LINES,
  TOWN_SCOUT_HIRE_LINES,
} from './constants'
import type { Action, Resources, State, TownCell, Ui } from './types'
import { pickIntExclusive } from './prng'
import { pickDeterministicLine } from './tiles/poiUtils'
import { enqueueAnim } from './uiAnim'

function gridTransitionDurationFrames(): number {
  return Math.max(1, Math.trunc(GRID_TRANSITION_STEP_FRAMES)) * 5
}

function getTownAtPlayer(s: State): TownCell | null {
  const p = s.player.position
  const cell = s.world.cells[p.y]![p.x]!
  return cell.kind === 'town' ? cell : null
}

function townPrefix(town: TownCell): string {
  const name = town.name || 'A Town'
  return `${name} Town`
}

function shuffledRumors(seed: number, townId: number): readonly string[] {
  const pool: string[] = []

  const groups = Object.values(BARKEEP_TIPS) as Array<readonly string[]>
  for (let i = 0; i < groups.length; i++) {
    const lines = groups[i]!
    for (let j = 0; j < lines.length; j++) pool.push(lines[j]!)
  }
  if (pool.length <= 1) return pool

  // Deterministic per-town shuffle so the purchase order isn't obvious after the first buy.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = pickIntExclusive({ seed, stepCount: 0, cellId: townId, salt: i }, i + 1)
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
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

  const seed = prevState.world.seed
  const stepCount = prevState.run.stepCount
  const townId = town.id
  const prefix = townPrefix(town)

  const prevRes = prevState.resources

  const setMessage = (line: string) => ({ ...prevState, ui: { ...prevState.ui, message: `${prefix}\n${line}` } })
  const noGold = () => setMessage(pickDeterministicLine(TOWN_NO_GOLD_LINES, seed, townId, stepCount))

  if (action.type === ACTION_TOWN_LEAVE) {
    const restore = enc.restoreMessage
    const baseUi: Ui = { ...prevState.ui, message: restore }
    if (!ENABLE_ANIMATIONS) return { ...prevState, encounter: null, ui: baseUi }
    const startFrame = baseUi.clock.frame
    const uiWith = enqueueAnim(baseUi, {
      kind: 'gridTransition',
      startFrame,
      durationFrames: gridTransitionDurationFrames(),
      blocksInput: true,
      params: { from: 'town', to: 'overworld' },
    })
    return { ...prevState, encounter: null, ui: uiWith }
  }

  if (action.type === ACTION_TOWN_BUY_FOOD) {
    const cost = town.prices.foodGold
    if (prevRes.gold < cost) return noGold()

    const nextResources: Resources = {
      ...prevRes,
      gold: prevRes.gold - cost,
      food: prevRes.food + town.bundles.food,
    }

    const line = pickDeterministicLine(TOWN_BUY_LINES, seed, townId, stepCount)
    const baseUi: Ui = { ...prevState.ui, message: `${prefix}\n${line}` }
    if (!ENABLE_ANIMATIONS) return { ...prevState, resources: nextResources, ui: baseUi }

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
      params: { target: 'food', delta: town.bundles.food },
    })
    return { ...prevState, resources: nextResources, ui: uiWith }
  }

  if (action.type === ACTION_TOWN_BUY_TROOPS) {
    const cost = town.prices.troopsGold
    if (prevRes.gold < cost) return noGold()

    const nextResources: Resources = {
      ...prevRes,
      gold: prevRes.gold - cost,
      armySize: prevRes.armySize + town.bundles.troops,
    }

    const line = pickDeterministicLine(TOWN_BUY_LINES, seed, townId, stepCount)
    const baseUi: Ui = { ...prevState.ui, message: `${prefix}\n${line}` }
    if (!ENABLE_ANIMATIONS) return { ...prevState, resources: nextResources, ui: baseUi }

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
    return { ...prevState, resources: nextResources, ui: uiWith }
  }

  if (action.type === ACTION_TOWN_HIRE_SCOUT) {
    if (prevRes.hasScout) {
      return setMessage(pickDeterministicLine(TOWN_SCOUT_ALREADY_HAVE_LINES, seed, townId, stepCount))
    }

    const cost = town.prices.scoutGold
    if (prevRes.gold < cost) return noGold()

    const nextResources: Resources = { ...prevRes, hasScout: true, gold: prevRes.gold - cost }
    const line = pickDeterministicLine(TOWN_SCOUT_HIRE_LINES, seed, townId, stepCount)
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
  const cursor = enc.rumorCursor
  const pool = shuffledRumors(seed, townId)
  const idx = pool.length > 0 ? cursor % pool.length : 0
  const line = pool[idx] || pool[0] || ''

  const nextEncounter = { ...enc, rumorCursor: cursor + 1 }
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
  return { ...prevState, resources: nextResources, encounter: nextEncounter, ui: uiWith }
}

