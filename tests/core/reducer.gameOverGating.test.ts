import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_MOVE, HENGE_COOLDOWN_MOVES } from '../../src/core/constants'
import type { Action, Cell, HengeCell, State, World } from '../../src/core/types'

// When the food cost of a move kills the player (army drops to 0), the destination tile's
// onEnterTile handler must not fire — no cell mutations, no encounter open, no RNG advance,
// no win triggered. The player just dies on the tile.

function blankWorld(opts: { center: Cell; rngState?: number }): World {
  const grass = (): Cell => ({ kind: 'grass' })
  return {
    seed: 1,
    width: 5,
    height: 5,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass(), grass(), grass()],
      [grass(), grass(), grass(), grass(), grass()],
      [grass(), grass(), opts.center, grass(), grass()],
      [grass(), grass(), grass(), grass(), grass()],
      [grass(), grass(), grass(), grass(), grass()],
    ],
    rngState: opts.rngState ?? 12345,
  }
}

// Player at (2,1), south move enters (2,2). food=0 + army=1 → cost-induced death.
function starveState(world: World): State {
  return {
    world,
    player: { position: { x: 2, y: 1 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: 0, gold: 0, armySize: 1, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

const stepSouth: Action = { type: ACTION_MOVE, dx: 0, dy: 1 }

describe('reducer game-over gating: tile handler suppressed when move kills player', () => {
  it('starving onto a henge does NOT set its cooldown', () => {
    const henge: HengeCell = { kind: 'henge', id: 7, name: 'The Mending', nextReadyStep: 0 }
    const next = processAction(starveState(blankWorld({ center: henge })), stepSouth)!

    expect(next.run.isGameOver).toBe(true)
    const onCenter = next.world.cells[2]![2]!
    expect(onCenter.kind).toBe('henge')
    expect((onCenter as HengeCell).nextReadyStep).toBe(0) // cooldown unchanged
  })

  it('starving onto a henge does NOT advance world.rngState (no spawnEnemyArmy call)', () => {
    const henge: HengeCell = { kind: 'henge', id: 7, name: 'The Mending', nextReadyStep: 0 }
    const initialRng = 99999
    const next = processAction(starveState(blankWorld({ center: henge, rngState: initialRng })), stepSouth)!

    expect(next.run.isGameOver).toBe(true)
    expect(next.world.rngState).toBe(initialRng)
  })

  it('starving onto a henge does NOT open a combat encounter', () => {
    const henge: HengeCell = { kind: 'henge', id: 7, name: 'The Mending', nextReadyStep: 0 }
    const next = processAction(starveState(blankWorld({ center: henge })), stepSouth)!

    expect(next.run.isGameOver).toBe(true)
    expect(next.encounter).toBeNull()
  })

  it('starving onto woods does NOT advance world.rngState (no teleport/spawn pick)', () => {
    const initialRng = 77777
    const woods: Cell = { kind: 'woods' }
    const next = processAction(starveState(blankWorld({ center: woods, rngState: initialRng })), stepSouth)!

    expect(next.run.isGameOver).toBe(true)
    expect(next.world.rngState).toBe(initialRng)
    expect(next.encounter).toBeNull()
    expect(next.player.position).toEqual({ x: 2, y: 2 }) // not teleported
  })

  it('starving onto a closed gate with the bronze key does NOT win the game (death takes priority)', () => {
    const gate: Cell = { kind: 'gate' }
    const world = blankWorld({ center: gate })
    const s = starveState(world)
    const sWithKey: State = { ...s, resources: { ...s.resources, hasBronzeKey: true } }

    const next = processAction(sWithKey, stepSouth)!

    expect(next.run.isGameOver).toBe(true)
    expect(next.run.hasWon).toBe(false)
    // Gate cell stays closed (not opened to gateOpen).
    expect(next.world.cells[2]![2]!.kind).toBe('gate')
  })

  it('non-fatal entry onto a henge still works: cooldown sets, encounter opens', () => {
    // Sanity-check the gate doesn't break the happy path.
    const henge: HengeCell = { kind: 'henge', id: 7, name: 'The Mending', nextReadyStep: 0 }
    const world = blankWorld({ center: henge })
    const s = starveState(world)
    const sHealthy: State = { ...s, resources: { ...s.resources, food: 10, armySize: 5 } }

    const next = processAction(sHealthy, stepSouth)!

    expect(next.run.isGameOver).toBe(false)
    const onCenter = next.world.cells[2]![2]!
    expect((onCenter as HengeCell).nextReadyStep).toBe(1 + HENGE_COOLDOWN_MOVES) // stepCount=1 + cooldown
    expect(next.encounter?.kind).toBe('combat')
  })
})
