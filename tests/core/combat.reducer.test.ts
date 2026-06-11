import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  GOBLIN_ENCOUNTER_LINES,
  HENGE_BAND_MAX,
  HENGE_BAND_MIN,
  INITIAL_FOOD,
  INITIAL_GOLD,
  WOODS_AMBUSH_PERCENT,
} from '../../src/core/constants'
import {
  ACTION_FIGHT,
  ACTION_RETURN,
  boarOpeningVolleyKills,
  combatFightHitOddsPercent,
  fightHitChancePercent,
  spawnEnemyArmy,
} from '../../src/core/mechanics/defs/combat'
import { hengeCombatVariant } from '../../src/core/mechanics/defs/henge'
import { goblinCombatVariant } from '../../src/core/mechanics/defs/woods'
import { RNG } from '../../src/core/rng'
import type { State, World } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

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
        opts.dstKind === 'henge' ? { kind: 'henge', id: 4, name: 'The Mending', nextReadyStep: 0, currentGroup: null } : { kind: 'woods' },
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
    resources: makeResources({ food: INITIAL_FOOD, gold: INITIAL_GOLD, armySize: 5 }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' } },
    pendingEvents: [],
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

    // Henge variant rolls U[HENGE_BAND_MIN..HENGE_BAND_MAX] from the world
    // stream — one int draw, same shape as `spawnEnemyArmy`'s rngState
    // advance, but the band is independent of player army.
    const r = RNG.createStreamRandom(w.rngState)
    const span = HENGE_BAND_MAX - HENGE_BAND_MIN + 1
    const expectedEnemy = HENGE_BAND_MIN + r.intExclusive(span)
    const expectedRng = r.rngState >>> 0

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.encounter?.kind).toBe('combat')
    expect(next.encounter && next.encounter.kind === 'combat' ? next.encounter.enemyArmySize : null).toBe(expectedEnemy)
    expect(next.world.rngState >>> 0).toBe(expectedRng)
    // Arrival message is exercised by henge unit tests; here we just
    // witness that some message was set.
    expect(next.ui.message).not.toBe('')

    // Enter-cost still applies on the move that starts combat. Food only
    // clamps on gain, so the move's shrink does not retroactively trim
    // food even when prev food sits above cap.
    expect(next.resources.food).toBe((INITIAL_FOOD | 0) - 1)
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
    // Woods ambush opens the goblin variant, so the opening line comes
    // from the goblin pool.
    expect(GOBLIN_ENCOUNTER_LINES.includes(next.ui.message as any)).toBe(true)
  })

  it('FIGHT victory highlights healer when mend restores troops', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 1 })
    const s = makeState(w)
    s.resources.party = ['healer']
    s.resources.armySize = 7
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 1,
      initialSpawn: 1,
      armyAtCombatStart: 10,
      sourceCellId: 4,
      restoreMessage: 'X',
      boarVolleyFired: false,
    }
    s.world.rngState = findRngStateForFightOutcome({ playerArmy: 7, enemyArmy: 1, want: 'win' })
    const next = processAction(s, { type: ACTION_FIGHT })!
    expect(next.encounter).toBeNull()
    expect(next.resources.armySize).toBe(9)
    expect(next.pendingEvents).toContainEqual({
      kind: 'iconHighlighted',
      target: { band: 'party', id: 'healer' },
    })
  })

  it('FIGHT win uses floor-halving (1->0), pays gold via henge variant, and ends combat', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 1 })
    const s = makeState(w)
    s.resources.food = 0
    s.resources.gold = 0
    s.resources.armySize = 5
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 1,
      initialSpawn: 1,
      armyAtCombatStart: 10,
      sourceCellId: 4,
      restoreMessage: 'The Mending Henge\nThe circle remembers old debts.',
      boarVolleyFired: false,
    }
    s.ui.message = ''

    const startRng = findRngStateForFightOutcome({ playerArmy: 5, enemyArmy: 1, want: 'win' })
    s.world.rngState = startRng

    const roundRng = RNG.createStreamRandom(startRng)
    const wRoll = roundRng.intExclusive(5 + 5)
    const bRoll = roundRng.intExclusive(1 + 5)

    // Source cell is a henge → variant is `hengeCombatVariant`. Compute the
    // expected reward by running the variant's own `victoryReward` against
    // the same rngState the reducer uses post-round.
    const baseAfterRound = { ...s.resources }
    const reward = hengeCombatVariant.victoryReward(baseAfterRound, roundRng.rngState, s.encounter)
    const expectedGold = reward.resources.gold - baseAfterRound.gold
    const expectedFoodBonus = reward.resources.food - baseAfterRound.food
    const expectedRng = reward.rngState >>> 0

    const next = processAction(s, { type: ACTION_FIGHT })!

    expect(next.encounter).toBe(null)
    expect(next.resources.gold).toBe(expectedGold)
    expect(next.resources.food).toBe(expectedFoodBonus)
    expect(next.world.rngState >>> 0).toBe(expectedRng)
    expect(next.ui.message).not.toBe('')

    const enemyDeltas = next.pendingEvents.filter(
      (e) => e.kind === 'resourceChanged' && e.target === 'enemyArmy',
    )
    expect(enemyDeltas.length).toBe(1)
    expect(enemyDeltas[0]!.kind === 'resourceChanged' && enemyDeltas[0]!.delta).toBe(-1)

    const foodDeltas = next.pendingEvents.filter(
      (e) => e.kind === 'resourceChanged' && e.target === 'food',
    )
    if (expectedFoodBonus) {
      expect(
        foodDeltas.some((e) => e.kind === 'resourceChanged' && e.delta === expectedFoodBonus),
      ).toBe(true)
    }

    const goldDeltas = next.pendingEvents.filter(
      (e) => e.kind === 'resourceChanged' && e.target === 'gold',
    )
    expect(goldDeltas.some((e) => e.kind === 'resourceChanged' && e.delta === expectedGold)).toBe(true)

    // Sanity: ensure our chosen rngState is actually a win for this test.
    expect(wRoll >= bRoll).toBe(true)
  })

  it('FIGHT loss reduces army by 1 and keeps combat active', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 1 })
    const s = makeState(w)
    s.resources.food = 10
    s.resources.armySize = 2
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 12,
      initialSpawn: 12,
      armyAtCombatStart: 10,
      sourceCellId: 4,
      restoreMessage: 'X',
      boarVolleyFired: false,
    }

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
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 30,
      initialSpawn: 30,
      armyAtCombatStart: 10,
      sourceCellId: 4,
      restoreMessage: 'X',
      boarVolleyFired: false,
    }
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

describe('combatFightHitOddsPercent', () => {
  it('returns null outside combat', () => {
    const s = makeState(makeWorld({ seed: 1, dstKind: 'henge', rngState: 123 }))
    expect(combatFightHitOddsPercent(s)).toBeNull()
  })

  it('wires henge variant roll bonuses', () => {
    const s = makeState(makeWorld({ seed: 1, dstKind: 'henge', rngState: 123 }))
    const combat = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const enc = combat.encounter
    expect(enc?.kind).toBe('combat')
    if (!enc || enc.kind !== 'combat') throw new Error('expected combat')
    expect(combatFightHitOddsPercent(combat)).toBe(
      fightHitChancePercent({
        playerArmy: combat.resources.armySize,
        enemyArmy: enc.enemyArmySize,
        playerRollBonus: hengeCombatVariant.playerRollBonus,
        enemyRollBonus: hengeCombatVariant.enemyRollBonus,
      }),
    )
  })

  it.each([
    [1, 1],
    [2, 1],
    [8, 2],
    [20, 5],
    [40, 10],
  ])('boarOpeningVolleyKills(%i) → %i', (enemy, kills) => {
    expect(boarOpeningVolleyKills(enemy)).toBe(kills)
  })

  it('boarOpeningVolleyKills returns 0 when enemy army is empty', () => {
    expect(boarOpeningVolleyKills(0)).toBe(0)
  })

  it('shows 100% hit odds when boar volley will fire on the next fight press', () => {
    const s = makeState(makeWorld({ seed: 1, dstKind: 'henge', rngState: 123 }))
    const combat = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const enc = combat.encounter
    if (!enc || enc.kind !== 'combat') throw new Error('expected combat')
    const withBoar = {
      ...combat,
      resources: { ...combat.resources, party: ['boar'] },
    }
    expect(boarOpeningVolleyKills(enc.enemyArmySize)).toBeGreaterThan(0)
    expect(combatFightHitOddsPercent(withBoar)).toBe(100)
  })

  it('FIGHT with boar applies volley only and does not consume fight rng', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 4242 })
    const s = makeState(w)
    s.resources.party = ['boar']
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 20,
      initialSpawn: 20,
      armyAtCombatStart: 5,
      sourceCellId: 4,
      restoreMessage: 'X',
      boarVolleyFired: false,
    }
    const next = processAction(s, { type: ACTION_FIGHT })!
    const enc = next.encounter
    if (!enc || enc.kind !== 'combat') throw new Error('expected combat')
    expect(enc.enemyArmySize).toBe(15)
    expect(enc.boarVolleyFired).toBe(true)
    expect(next.world.rngState).toBe(4242)
    expect(next.pendingEvents).toEqual([
      { kind: 'resourceChanged', target: 'enemyArmy', delta: -5 },
      { kind: 'iconHighlighted', target: { band: 'party', id: 'boar' } },
    ])
  })

  it('boar volley does not fire again on later fight presses in the same encounter', () => {
    const w = makeWorld({ seed: 1, dstKind: 'henge', rngState: 4242 })
    const s = makeState(w)
    s.resources.party = ['boar']
    s.resources.armySize = 5
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 20,
      initialSpawn: 20,
      armyAtCombatStart: 5,
      sourceCellId: 4,
      restoreMessage: 'X',
      boarVolleyFired: false,
    }
    const afterVolley = processAction(s, { type: ACTION_FIGHT })!
    const volleyEnc = afterVolley.encounter
    if (!volleyEnc || volleyEnc.kind !== 'combat') throw new Error('expected combat')
    expect(volleyEnc.enemyArmySize).toBe(15)

    const lossRng = findRngStateForFightOutcome({ playerArmy: 5, enemyArmy: 15, want: 'loss' })
    afterVolley.world.rngState = lossRng
    const afterRound = processAction(afterVolley, { type: ACTION_FIGHT })!
    const roundEnc = afterRound.encounter
    if (!roundEnc || roundEnc.kind !== 'combat') throw new Error('expected combat')
    expect(roundEnc.enemyArmySize).toBe(15)
    expect(afterRound.resources.armySize).toBe(4)
  })

  it('wires goblin variant roll bonuses for woods ambush', () => {
    const cellId = 1 * 3 + 1
    const seed = findSeedForAmbush(cellId)
    const s = makeState(makeWorld({ seed, dstKind: 'woods', rngState: 999 }))
    const combat = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const enc = combat.encounter
    expect(enc?.kind).toBe('combat')
    if (!enc || enc.kind !== 'combat') throw new Error('expected combat')
    expect(combatFightHitOddsPercent(combat)).toBe(
      fightHitChancePercent({
        playerArmy: combat.resources.armySize,
        enemyArmy: enc.enemyArmySize,
        playerRollBonus: goblinCombatVariant.playerRollBonus,
        enemyRollBonus: goblinCombatVariant.enemyRollBonus,
      }),
    )
  })
})

describe('fightHitChancePercent', () => {
  it('10v20 +5/+5 → 32% (120/375 winning pairs)', () => {
    expect(fightHitChancePercent({ playerArmy: 10, enemyArmy: 20, playerRollBonus: 5, enemyRollBonus: 5 })).toBe(32)
  })

  it('10v40 +5/+5 → lower hit rate than 10v20', () => {
    const vs20 = fightHitChancePercent({ playerArmy: 10, enemyArmy: 20, playerRollBonus: 5, enemyRollBonus: 5 })
    const vs40 = fightHitChancePercent({ playerArmy: 10, enemyArmy: 40, playerRollBonus: 5, enemyRollBonus: 5 })
    expect(vs40).toBeLessThan(vs20)
    expect(vs40).toBe(18)
  })

  it('goblin +6/+3 is more favorable than brigand +5/+5 at same sizes', () => {
    const brigand = fightHitChancePercent({ playerArmy: 10, enemyArmy: 20, playerRollBonus: 5, enemyRollBonus: 5 })
    const goblin = fightHitChancePercent({ playerArmy: 10, enemyArmy: 20, playerRollBonus: 6, enemyRollBonus: 3 })
    expect(goblin).toBeGreaterThan(brigand)
  })
})

