import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { getRightGridCellDef } from '../../src/core/rightGrid'
import {
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  ACTION_MOVE,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
  CAMP_COOLDOWN_MOVES,
  CAMP_EMPTY_LINES,
  CAMP_FOOD_GAIN,
  CAMP_RECRUIT_LINES,
  INITIAL_FOOD,
  MAP_HINT_MESSAGE,
  SWAMP_LOST_PERCENT,
} from '../../src/core/constants'
import { computeCampArmyGain } from '../../src/core/camp'
import { pickIntExclusive } from '../../src/core/prng'
import { pickDeterministicLine } from '../../src/core/tiles/poiUtils'
import type { Cell, State, World } from '../../src/core/types'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(seed: number, campNextReadyStep = 0): World {
  return {
    seed,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), { kind: 'camp', id: 4, name: 'Ember Cross', nextReadyStep: campNextReadyStep }, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 123,
  }
}

function makeState(world: World): State {
  return {
    world,
    player: { position: { x: 1, y: 0 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: INITIAL_FOOD, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

function findSeedForSwampLost(stepCount: number, cellId: number): number {
  for (let seed = 1; seed < 200000; seed++) {
    const p = pickIntExclusive({ seed, stepCount, cellId }, 100)
    if (p < SWAMP_LOST_PERCENT) return seed
  }
  throw new Error('seed not found')
}

describe('v0.2 map+scout acceptance', () => {
  it('stepping onto a camp enters a camp encounter; MOVE ignored until Leave', () => {
    const s0 = makeState(makeWorld(7))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('camp')

    const ignored = processAction(onto, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(ignored).toBe(onto)

    const left = processAction(onto, { type: ACTION_CAMP_LEAVE })!
    expect(left.encounter).toBe(null)
  })

  it('camp does not rescue hunger death on entry', () => {
    const s0 = makeState(makeWorld(7))
    s0.resources.food = 0
    s0.resources.armySize = 1
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.run.isGameOver).toBe(true)
    expect(onto.encounter).toBe(null)
  })

  it('TOGGLE_MAP works during camp encounter and restores previous panel/message on close', () => {
    const s0 = makeState(makeWorld(7))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const prevMessage = onto.ui.message
    expect(onto.encounter?.kind).toBe('camp')
    expect(onto.ui.leftPanel.kind).toBe('auto')

    const opened = processAction(onto, { type: ACTION_TOGGLE_MAP })!
    expect(opened.ui.leftPanel.kind).toBe('map')
    expect(opened.ui.message).toBe(MAP_HINT_MESSAGE)

    const closed = processAction(opened, { type: ACTION_TOGGLE_MAP })!
    expect(closed.ui.leftPanel.kind).toBe('auto')
    expect(closed.ui.message).toBe(prevMessage)
  })

  it('map/minimap toggles are mutually exclusive (last toggle wins)', () => {
    const s0 = makeState(makeWorld(7))
    const mini = processAction(s0, { type: ACTION_TOGGLE_MINIMAP })!
    expect(mini.ui.leftPanel.kind).toBe('minimap')

    const map = processAction(mini, { type: ACTION_TOGGLE_MAP })!
    expect(map.ui.leftPanel.kind).toBe('map')

    const mini2 = processAction(map, { type: ACTION_TOGGLE_MINIMAP })!
    expect(mini2.ui.leftPanel.kind).toBe('minimap')
  })

  it('Search camp grants deterministic reinforcements when ready; then becomes empty for the second Search', () => {
    const s0 = makeState(makeWorld(7, 0))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const stepCount = onto.run.stepCount
    const armyGain = computeCampArmyGain({ seed: onto.world.seed, campId: 4, stepCount })

    const after = processAction(onto, { type: ACTION_CAMP_SEARCH })!
    expect(after.resources.food).toBe(onto.resources.food + CAMP_FOOD_GAIN)
    expect(after.resources.armySize).toBe(onto.resources.armySize + armyGain)
    expect(after.ui.message).toBe(`Ember Cross Camp\n${pickDeterministicLine(CAMP_RECRUIT_LINES, onto.world.seed, 4, stepCount)}`)

    const second = processAction(after, { type: ACTION_CAMP_SEARCH })!
    expect(second.resources.food).toBe(after.resources.food)
    expect(second.resources.armySize).toBe(after.resources.armySize)
    expect(second.ui.message).toBe(`Ember Cross Camp\n${pickDeterministicLine(CAMP_EMPTY_LINES, onto.world.seed, 4, stepCount)}`)

    const campCell = second.world.cells[1]![1]!
    expect(campCell.kind).toBe('camp')
    if (campCell.kind === 'camp') expect(campCell.nextReadyStep).toBe(stepCount + CAMP_COOLDOWN_MOVES)
  })

  it('camp does not offer Hire Scout (moved to towns)', () => {
    const s0 = makeState(makeWorld(7))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('camp')

    // North is disabled in camp.
    const north = getRightGridCellDef(onto, 0, 1)
    expect(north.action).toBe(null)
  })

  it('while lost, MOVE appends an unmapped path step', () => {
    const s0 = makeState(makeWorld(7))
    s0.run.knowsPosition = false
    const next = processAction(s0, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next.run.path.length).toBe(1)
    expect(next.run.path[0]!.isMapped).toBe(false)
    expect(next.run.lostBufferStartIndex).toBe(0)
  })

  it('when re-oriented, backfills mappedness from lostBufferStartIndex and clears it', () => {
    // Put a signpost at (1,1) and start at (1,0).
    const w = makeWorld(7)
    w.cells[1]![1] = { kind: 'signpost' }
    const s0 = makeState(w)
    s0.run.knowsPosition = false
    s0.run.path = [{ pos: { x: 0, y: 0 }, isMapped: false }]
    s0.run.lostBufferStartIndex = 0

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.run.knowsPosition).toBe(true)
    expect(onto.run.lostBufferStartIndex).toBe(null)
    expect(onto.run.path.every((p) => p.isMapped)).toBe(true)
  })

  it('teleport while already lost overwrites lostBufferStartIndex (discard buffer)', () => {
    // Put swamp at (1,1) and ensure lost triggers on stepCount=1.
    const w = makeWorld(1)
    w.cells[1]![1] = { kind: 'swamp' }
    const cellId = 1 * w.width + 1
    w.seed = findSeedForSwampLost(1, cellId)

    const s0 = makeState(w)
    s0.run.knowsPosition = false
    // Pretend we already had a prior buffered segment.
    s0.run.path = [{ pos: { x: 0, y: 0 }, isMapped: false }]
    s0.run.lostBufferStartIndex = 0
    const prev = s0.run.lostBufferStartIndex

    const ontoSwamp = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(ontoSwamp.run.knowsPosition).toBe(false)
    expect(ontoSwamp.run.lostBufferStartIndex).toBe(ontoSwamp.run.path.length - 1)
    expect(ontoSwamp.run.lostBufferStartIndex).not.toBe(prev)
  })
})

