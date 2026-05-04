import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_FIGHT,
  ACTION_MOVE,
  ACTION_RETURN,
  COMBAT_ENCOUNTER_LINES,
  COMBAT_FOOD_BONUS_MAX,
  COMBAT_GOLD_REWARD_MAX,
  COMBAT_GOLD_REWARD_MIN,
  ENABLE_ANIMATIONS,
  HENGE_ENCOUNTER_LINE,
  INITIAL_FOOD,
  INITIAL_GOLD,
  WOODS_AMBUSH_PERCENT,
} from '../../src/core/constants'
import { spawnEnemyArmy } from '../../src/core/combat'
import { RNG } from '../../src/core/rng'
import { foodCarryCap } from '../../src/core/foodCarry'
import type { DeltaAnim, State, World } from '../../src/core/types'

function makeWorld(opts: { seed: number; dstKind: 'henge' | 'woods'; rngState: number }): World {
  return {
    seed: opts.seed,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [
        { kind: 'grass' },
        opts.dstKind === 'henge' ? { kind: 'henge', id: 4, name: 'The Mending', nextReadyStep: 0 } : { kind: 'woods' },
        { kind: 'grass' },
      ],
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
    ],
    rngState: opts.rngState,
  }
}

function makeState(w: World): State {
  return {
    world: w,
    player: { position: { x: 1, y: 0 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: INITIAL_FOOD, gold: INITIAL_GOLD, armySize: 5, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

function findSeedForAmbush(cellId: number): number {
  for (let seed = 1; seed < 10000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount: 1, cellId }, 100)
    if (p < WOODS_AMBUSH_PERCENT) return seed
  }
  throw new Error('could not find ambush seed')
}

function findRngStateForFightOutcome(opts: { playerArmy: number; enemyArmy: number; want: 'win' | 'loss' }): number {
  let rng = 1
  for (let i = 0; i < 10000; i++) {
    const r = RNG.createStreamRandom(rng)
    const w = r.intExclusive(opts.playerArmy + 5)
    const b = r.intExclusive(opts.enemyArmy + 5)
    const isWin = w >= b
    if ((opts.want === 'win' && isWin) || (opts.want === 'loss' && !isWin)) return rng
    const adv = RNG.createStreamRandom(rng)
    adv.intExclusive(1)
    rng = adv.rngState
  }
  throw new Error(`could not find rngState for ${opts.want}`)
}

describe('combat reducer (v0.0.7)', () => {
  it('entering a henge starts combat and consumes rng once for enemy spawn', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 123 })
    const s = makeState(w)

    const spawned = spawnEnemyArmy({ rngState: w.rngState, playerArmy: s.resources.armySize })
    const expectedEnemy = spawned.enemyArmy
    const expectedRng = spawned.rngState >>> 0

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.encounter?.kind).toBe('combat')
    expect(next.encounter && next.encounter.kind === 'combat' ? next.encounter.enemyArmySize : null).toBe(expectedEnemy)
    expect(next.world.rngState >>> 0).toBe(expectedRng)
    expect(next.ui.message).toBe(HENGE_ENCOUNTER_LINE)

    // Enter-cost still applies on the move that starts combat.
    expect(next.resources.food).toBe(
      Math.min((INITIAL_FOOD | 0) - 1, foodCarryCap({ armySize: s.resources.armySize, hasTameBeast: false })),
    )
  })

  it('woods move with no ambush does not consume rng and does not start combat', () => {
    const cellId = 1 * 3 + 1
    let seed = 1
    // Find a seed where ambush does not trigger for stepCount=1 on this cellId.
    for (; seed < 10000; seed++) {
      const p = RNG.keyedIntExclusive({ seed, stepCount: 1, cellId }, 100)
      if (p >= WOODS_AMBUSH_PERCENT) break
    }
    const w = makeWorld({ seed, dstKind: 'woods', rngState: 777 })
    const s = makeState(w)
    const beforeRng = w.rngState >>> 0

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.encounter).toBe(null)
    expect(next.world.rngState >>> 0).toBe(beforeRng)
  })

  it('woods ambush starts combat and consumes rng for enemy spawn', () => {
    const cellId = 1 * 3 + 1
    const seed = findSeedForAmbush(cellId)
    const w = makeWorld({ seed, dstKind: 'woods', rngState: 999 })
    const s = makeState(w)

    const spawned = spawnEnemyArmy({ rngState: w.rngState, playerArmy: s.resources.armySize })
    const expectedEnemy = spawned.enemyArmy
    const expectedRng = spawned.rngState >>> 0

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.encounter?.kind).toBe('combat')
    expect(next.encounter && next.encounter.kind === 'combat' ? next.encounter.enemyArmySize : null).toBe(expectedEnemy)
    expect(next.world.rngState >>> 0).toBe(expectedRng)
    expect(COMBAT_ENCOUNTER_LINES.includes(next.ui.message as any)).toBe(true)
  })

  it('FIGHT win uses floor-halving (1->0), pays gold once at the end (5..15) plus 0..2 food, and ends combat', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 1 })
    const s = makeState(w)
    s.resources.food = 0
    s.resources.gold = 0
    s.resources.armySize = 5
    s.encounter = { kind: 'combat', enemyArmySize: 1, sourceKind: 'henge', sourceCellId: 4, restoreMessage: 'The Mending Henge\nThe circle remembers old debts.' }
    s.ui.message = HENGE_ENCOUNTER_LINE

    const startRng = findRngStateForFightOutcome({ playerArmy: 5, enemyArmy: 1, want: 'win' })
    s.world.rngState = startRng

    const roundRng = RNG.createStreamRandom(startRng)
    const wRoll = roundRng.intExclusive(5 + 5)
    const bRoll = roundRng.intExclusive(1 + 5)

    const rewardRng = RNG.createStreamRandom(roundRng.rngState)
    const expectedGold = COMBAT_GOLD_REWARD_MIN + rewardRng.intExclusive(COMBAT_GOLD_REWARD_MAX - COMBAT_GOLD_REWARD_MIN + 1)
    const expectedFoodBonus = rewardRng.intExclusive(COMBAT_FOOD_BONUS_MAX + 1)
    const expectedRng = rewardRng.rngState >>> 0

    const next = processAction(s, { type: ACTION_FIGHT })!

    expect(next.encounter).toBe(null)
    expect(next.resources.gold).toBe(expectedGold)
    expect(next.resources.food).toBe(expectedFoodBonus)
    expect(next.world.rngState >>> 0).toBe(expectedRng)
    expect(next.ui.message).not.toBe(HENGE_ENCOUNTER_LINE)

    if (ENABLE_ANIMATIONS) {
      const enemyDeltas = next.ui.anim.active.filter((a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'enemyArmy')
      expect(enemyDeltas.length).toBe(1)
      expect(enemyDeltas[0]!.params.delta).toBe(-1)

      const foodDeltas = next.ui.anim.active.filter((a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'food')
      if (expectedFoodBonus) expect(foodDeltas.some((d) => d.params.delta === expectedFoodBonus)).toBe(true)

      const goldDeltas = next.ui.anim.active.filter((a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'gold')
      expect(goldDeltas.some((d) => d.params.delta === expectedGold)).toBe(true)
    }

    // Sanity: ensure our chosen rngState is actually a win for this test.
    expect(wRoll >= bRoll).toBe(true)
  })

  it('FIGHT loss reduces army by 1 and keeps combat active', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 1 })
    const s = makeState(w)
    s.resources.food = 10
    s.resources.armySize = 2
    s.encounter = { kind: 'combat', enemyArmySize: 12, sourceKind: 'henge', sourceCellId: 4, restoreMessage: 'X' }

    const startRng = findRngStateForFightOutcome({ playerArmy: 2, enemyArmy: 12, want: 'loss' })
    s.world.rngState = startRng

    const next = processAction(s, { type: ACTION_FIGHT })!

    expect(next.encounter?.kind).toBe('combat')
    expect(next.resources.armySize).toBe(1)
  })

  it('RETURN exits combat, costs 1 troop, and does not consume rng', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 12345 })
    const s = makeState(w)
    s.resources.food = 7
    s.resources.armySize = 4
    s.encounter = { kind: 'combat', enemyArmySize: 30, sourceKind: 'henge', sourceCellId: 4, restoreMessage: 'X' }
    const beforeRng = s.world.rngState >>> 0

    const next = processAction(s, { type: ACTION_RETURN })!

    expect(next.encounter).toBe(null)
    expect(next.resources.food).toBe(7)
    expect(next.resources.armySize).toBe(3)
    expect(next.world.rngState >>> 0).toBe(beforeRng)
  })

  it('henge always starts combat when ready', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 123 })
    const s = makeState(w)
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.encounter?.kind).toBe('combat')
  })
})

