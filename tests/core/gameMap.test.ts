import { describe, expect, it } from 'vitest'
import { computeGameMapView } from '../../src/core/gameMap'
import type { Cell, State, World } from '../../src/core/types'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(): World {
  return {
    seed: 1,
    width: 4,
    height: 4,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'farm', id: 1, name: 'F', beastGoldCost: 10 }, { kind: 'camp', id: 2, name: 'C', nextReadyStep: 0 }, { kind: 'henge', id: 3, name: 'H', nextReadyStep: 0 }, { kind: 'gate' }],
      [
        { kind: 'locksmith' },
        {
          kind: 'town',
          id: 5,
          name: 'Stonebridge',
          offers: ['buyFood', 'buyTroops', 'hireScout'],
          prices: { foodGold: 3, troopsGold: 5, scoutGold: 12, rumorGold: 3 },
          bundles: { food: 3, troops: 2 },
        },
        grass(),
        grass(),
      ],
      [grass(), grass(), grass(), grass()],
      [grass(), grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(): State {
  return {
    world: makeWorld(),
    player: { position: { x: 0, y: 0 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: 10, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('computeGameMapView', () => {
  function keys(markers: Array<{ pos: { x: number; y: number }; label: string; isMapped: boolean }>) {
    return markers.map((m) => `${m.label}@${m.pos.x},${m.pos.y}:${m.isMapped ? '1' : '0'}`).sort()
  }

  it('showPlayer is true only when oriented', () => {
    const s = makeState()
    expect(computeGameMapView(s).showPlayer).toBe(false)
    s.run.knowsPosition = true
    expect(computeGameMapView(s).showPlayer).toBe(true)
  })

  it('without scout, shows only mapped landmarks from run.path', () => {
    const s = makeState()
    s.run.knowsPosition = true
    // Simulate the gate having been opened already.
    s.world.cells[0]![3] = { kind: 'gateOpen' }
    s.run.path = [
      { pos: { x: 3, y: 0 }, isMapped: true }, // gate
      { pos: { x: 0, y: 1 }, isMapped: false }, // locksmith (unmapped -> hidden)
      { pos: { x: 1, y: 1 }, isMapped: true }, // town
      { pos: { x: 0, y: 0 }, isMapped: true }, // farm
    ]
    expect(keys(computeGameMapView(s).markers)).toEqual(['F@0,0:1', 'G@3,0:1', 'T@1,1:1'])
  })

  it('while lost, shows landmarks encountered since lostBufferStartIndex even if unmapped', () => {
    const s = makeState()
    s.run.knowsPosition = false
    s.run.path = [
      { pos: { x: 3, y: 0 }, isMapped: false }, // gate (pre-buffer -> hidden)
      { pos: { x: 0, y: 0 }, isMapped: false }, // farm (buffer -> visible)
      { pos: { x: 1, y: 1 }, isMapped: false }, // town (buffer -> visible)
      { pos: { x: 0, y: 1 }, isMapped: false }, // locksmith (buffer -> visible)
    ]
    s.run.lostBufferStartIndex = 1
    expect(keys(computeGameMapView(s).markers)).toEqual(['F@0,0:0', 'L@0,1:0', 'T@1,1:0'])
  })

  it('while lost, scout does not globally reveal farms/camps/henges until oriented', () => {
    const s = makeState()
    s.run.knowsPosition = false
    s.resources.hasScout = true
    s.run.path = [{ pos: { x: 0, y: 1 }, isMapped: false }] // locksmith only
    s.run.lostBufferStartIndex = 0

    expect(keys(computeGameMapView(s).markers)).toEqual(['L@0,1:0'])
  })

  it('with scout, reveals farms/camps/henges/towns globally but not gate/locksmith', () => {
    const s = makeState()
    s.run.knowsPosition = true
    s.resources.hasScout = true
    s.run.path = [
      { pos: { x: 0, y: 1 }, isMapped: true }, // locksmith (mapped -> visible)
      { pos: { x: 1, y: 1 }, isMapped: true }, // town (mapped -> visible)
      { pos: { x: 3, y: 0 }, isMapped: false }, // gate (unmapped -> hidden)
    ]

    expect(keys(computeGameMapView(s).markers)).toEqual([
      'C@1,0:1',
      'F@0,0:1',
      'H@2,0:1',
      'L@0,1:1',
      'T@1,1:1',
    ])
  })
})

