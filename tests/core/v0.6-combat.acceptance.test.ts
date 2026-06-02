import { describe, expect, it } from 'vitest'
// Force the mechanics index to load before any direct imports from
// `defs/combat.ts` — the same lazy-circular protection used by other v0.x
// acceptance suites that walk into combat.
import '../../src/core/mechanics'
import {
  BRIGAND_FOOD_MAX,
  BRIGAND_GOLD_NOISE,
  BRIGAND_RECRUIT_NO_FUNDS_LINES,
  BRIGAND_RECRUIT_NOT_WOUNDED_LINES,
  BRIGAND_RECRUIT_SUCCESS_LINES,
  BRIGAND_RECRUIT_TOO_MANY_LINES,
  GOBLIN_ENCOUNTER_LINES,
  GOBLIN_NOT_RECRUITABLE_LINES,
  HENGE_BAND_MAX,
  HENGE_BAND_MIN,
  HENGE_COOLDOWN_MOVES,
  HENGE_RECRUIT_SUCCESS_LINES,
} from '../../src/core/constants'
import { RNG } from '../../src/core/rng'
import { spawnEnemyArmy } from '../../src/core/mechanics/defs/combat'
import { brigandCombatVariant } from '../../src/core/mechanics/defs/mountain'
import { goblinCombatVariant } from '../../src/core/mechanics/defs/woods'
import { hengeCombatVariant } from '../../src/core/mechanics/defs/henge'
import { MECHANIC_INDEX } from '../../src/core/mechanics'
import { processAction } from '../../src/core/processAction'
import { ACTION_COMBAT_PAY, ACTION_FIGHT, ACTION_RETURN } from '../../src/core/mechanics/defs/combat'
import { SPRITES } from '../../src/core/spriteIds'
import type { CombatEncounter, HengeCell, State } from '../../src/core/types'
import {
  hengeCellAt,
  stateOnHenge,
  stateOnLair,
  stateOnMountainAmbush,
  stateOnWoodsAmbush,
  stepSouth,
  variantOf,
} from './_helpers/v0.6Combat'

// Acceptance specs are drawn from
// `docs/plans/2026-06-01-v0.6-combat-balance-design.md`.
//
// Worlds are hand-built (no `generateWorld`) so each scenario isolates
// one observable behaviour — variant identity, reward distribution,
// recruit eligibility, etc.

describe('v0.6 combat balance acceptance', () => {
  // Witnesses three things at once: the variant resolved by the registry
  // for the source cell, the +6/+3 round-math bonuses, and the encounter
  // message picked from the goblin pool (lore is the user-visible witness
  // that woods routed somewhere other than brigand).
  it('stepping into a woods ambush opens the goblin combat variant', () => {
    const state = stateOnWoodsAmbush({ playerArmy: 5 })

    const opened = stepSouth(state)
    expect(opened.encounter?.kind).toBe('combat')

    const variant = variantOf(opened)
    expect(variant).toBe(goblinCombatVariant)
    expect(variant).not.toBe(brigandCombatVariant)
    expect(variant.playerRollBonus).toBe(6)
    expect(variant.enemyRollBonus).toBe(3)
    expect(variant.centerSpriteId).toBe(130)
    expect(GOBLIN_ENCOUNTER_LINES).toContain(opened.ui.message)
  })

  // Brigand variant in mountains uses the standard 5/5 round math.
  it('stepping into a mountain ambush opens the brigand combat variant', () => {
    const state = stateOnMountainAmbush({ playerArmy: 5 })

    const opened = stepSouth(state)
    expect(opened.encounter?.kind).toBe('combat')

    const variant = variantOf(opened)
    expect(variant).toBe(brigandCombatVariant)
    expect(variant.playerRollBonus).toBe(5)
    expect(variant.enemyRollBonus).toBe(5)
  })

  // Goblins are not recruitable: pressing pay never spends gold and
  // surfaces the teaching line from the goblin failLines pool.
  //
  // Pressing the top slot on a live goblin encounter routes through
  // `reduceCombatPay`'s `unrecruitable` fail branch. Witnesses:
  //   - encounter pointer survives (same band, same wounded count),
  //   - resources untouched (no gold deduction, no army growth),
  //   - UI message picks from `GOBLIN_NOT_RECRUITABLE_LINES`.
  it('pressing recruit on a goblin encounter never spends gold and shows the teaching line', () => {
    const opened = stepSouth(stateOnWoodsAmbush({ playerArmy: 5 }))
    expect(opened.encounter?.kind).toBe('combat')
    const goldBefore = opened.resources.gold
    const armyBefore = opened.resources.armySize
    const enemyBefore = (opened.encounter as CombatEncounter).enemyArmySize

    const afterRecruit: State | null = processAction(opened, { type: ACTION_COMBAT_PAY })
    expect(afterRecruit).not.toBeNull()
    const next = afterRecruit!

    expect(next.encounter?.kind).toBe('combat')
    expect((next.encounter as CombatEncounter).enemyArmySize).toBe(enemyBefore)
    expect(next.resources.gold).toBe(goldBefore)
    expect(next.resources.armySize).toBe(armyBefore)
    expect(GOBLIN_NOT_RECRUITABLE_LINES).toContain(next.ui.message)
  })

  // ----------------------------------------------------------------
  // Henge persistence
  // ----------------------------------------------------------------
  // Fresh entry rolls a band into the henge cell.
  //
  // The persistent-band state machine: a freshly-visited henge rolls
  // U[HENGE_BAND_MIN..HENGE_BAND_MAX] and writes the count into
  // `cell.currentGroup` so a flee-and-return resumes against the wounded
  // count (S4). Witnesses: encounter opens with `enemyArmySize ===
  // initialSpawn ∈ [10..40]`, cell carries the same `currentGroup`, and
  // the source cell binds the henge variant.
  it('Henge holds persistent group on first encounter', () => {
    const opened = stepSouth(stateOnHenge({ playerArmy: 5 }))
    expect(opened.encounter?.kind).toBe('combat')

    const enc = opened.encounter as CombatEncounter
    expect(enc.enemyArmySize).toBe(enc.initialSpawn)
    expect(enc.enemyArmySize).toBeGreaterThanOrEqual(HENGE_BAND_MIN)
    expect(enc.enemyArmySize).toBeLessThanOrEqual(HENGE_BAND_MAX)

    const cell = hengeCellAt(opened, enc.sourceCellId)
    expect(cell.currentGroup).toBe(enc.enemyArmySize)
    expect(variantOf(opened)).toBe(hengeCombatVariant)
  })

  // Flee leaves the wounded count behind, no cooldown.
  //
  // After at least one fight round wounds the band, the player flees. The
  // henge cell's `currentGroup` must equal the encounter's wounded count at
  // flee time, and `nextReadyStep` must NOT advance — the natural cost of
  // re-entry (1 troop + 2 food) is friction enough.
  it('Fleeing henge leaves wounded band, no cooldown', () => {
    // Large army keeps fight rounds reliably player-favoured: each
    // playerHit halves the band, so 1-2 rounds are enough to wound.
    const opened = stepSouth(stateOnHenge({ playerArmy: 100, food: 50, gold: 50 }))
    expect(opened.encounter?.kind).toBe('combat')

    const before = opened.encounter as CombatEncounter
    const startNextReadyStep = hengeCellAt(opened, before.sourceCellId).nextReadyStep

    // Fight one round to wound the band (player favoured at 100 vs ≤ 40).
    const afterFight = processAction(opened, { type: ACTION_FIGHT })!
    if (afterFight.encounter == null) {
      // Unlucky one-shot kill — that's the defeat-cell-empties branch,
      // not the flee-leaves-wounded branch we're witnessing here.
      return
    }
    const woundedEnc = afterFight.encounter as CombatEncounter
    expect(woundedEnc.enemyArmySize).toBeLessThan(before.enemyArmySize)

    // Flee.
    const afterFlee = processAction(afterFight, { type: ACTION_RETURN })!
    expect(afterFlee.encounter).toBeNull()

    const cellAfter = hengeCellAt(afterFlee, before.sourceCellId)
    expect(cellAfter.currentGroup).toBe(woundedEnc.enemyArmySize)
    // No cooldown advance — flee is recoverable.
    expect(cellAfter.nextReadyStep).toBe(startNextReadyStep)
  })

  // Defeating the band empties the cell + starts cooldown.
  //
  // Fighting a 1-strength henge band to zero closes the encounter via
  // victory. The hook clears `currentGroup` and sets `nextReadyStep =
  // run.stepCount + HENGE_COOLDOWN_MOVES`.
  it('Defeating henge band empties cell and starts cooldown', () => {
    // Hand-build an in-progress encounter against a 1-strength band — the
    // first FIGHT round either wins outright or wounds to 0 next round.
    // This is more deterministic than walking into the henge and waiting
    // for a roll; the post-victory hook is what we're testing.
    const sourceCellId = 1 * 3 + 1
    const henge: HengeCell = {
      kind: 'henge',
      id: sourceCellId,
      name: 'The Mending',
      nextReadyStep: 0,
      currentGroup: 1,
    }
    // Player at the henge (no move). Encounter open against the persisted
    // band, set up exactly as a wounded re-entry would have.
    const base = stateOnHenge({ hengeCell: henge, playerArmy: 100, food: 50, gold: 50, stepCount: 5 })
    const inFight: State = {
      ...base,
      player: { position: { x: 1, y: 1 } },
      run: { ...base.run, stepCount: 5 },
      encounter: {
        kind: 'combat',
        enemyArmySize: 1,
        initialSpawn: 1,
        sourceCellId,
        restoreMessage: '',
      },
    }

    // Fight rounds until the band falls to zero (player has 100 vs 1; this
    // takes at most a handful of unlucky rounds).
    let s: State = inFight
    for (let i = 0; i < 50 && s.encounter != null; i++) {
      const next = processAction(s, { type: ACTION_FIGHT })
      if (!next) throw new Error('unexpected null in S5 fight loop')
      s = next
    }
    expect(s.encounter).toBeNull()
    expect(s.run.isGameOver).toBe(false)

    const cellAfter = hengeCellAt(s, sourceCellId)
    expect(cellAfter.currentGroup).toBeNull()
    // Cooldown gates the next fresh band.
    expect(cellAfter.nextReadyStep).toBe(s.run.stepCount + HENGE_COOLDOWN_MOVES)
  })

  // ----------------------------------------------------------------
  // Recruit slot + brigand/henge eligibility — Specs S10..S14
  // ----------------------------------------------------------------

  // Build an in-progress brigand combat (mountain source cell, hand-crafted
  // encounter snapshot). Bypasses ambush-rolls so each scenario can set
  // exact `enemyArmySize` / `initialSpawn` / gold values; the variant still
  // resolves through the registry from the cell at `sourceCellId` so the
  // dispatch path under test (`reduceCombatPay` → variant.payment) is the
  // production one.
  function brigandFightInProgress(opts: {
    enemyArmySize: number
    initialSpawn: number
    gold: number
    playerArmy?: number
  }): State {
    const sourceCellId = 1 * 3 + 1
    const base = stateOnMountainAmbush({ playerArmy: opts.playerArmy ?? 100, gold: opts.gold, food: 50 })
    return {
      ...base,
      player: { position: { x: 1, y: 1 } },
      run: { ...base.run, stepCount: 5 },
      encounter: {
        kind: 'combat',
        enemyArmySize: opts.enemyArmySize,
        initialSpawn: opts.initialSpawn,
        sourceCellId,
        restoreMessage: '',
      },
    }
  }

  // Recruit slot renders during all combat variants.
  //
  // The right-grid's top slot (row=0, col=1) is the recruit/pay button. The
  // grid factory wires it unconditionally; this acceptance test is the
  // regression witness — every combat source must surface the slot, even
  // unrecruitable goblins (the slot fires the teaching line on press).
  it('Recruit slot renders during all combat variants', () => {
    const rightGrid = MECHANIC_INDEX.rightGridByEncounterKind.combat
    if (!rightGrid) throw new Error('no combat right-grid registered')

    const cases: Array<{ name: string; opened: State }> = [
      { name: 'brigand', opened: stepSouth(stateOnMountainAmbush({ playerArmy: 5 })) },
      { name: 'goblin', opened: stepSouth(stateOnWoodsAmbush({ playerArmy: 5 })) },
      { name: 'henge', opened: stepSouth(stateOnHenge({ playerArmy: 5 })) },
      { name: 'wyrm', opened: stepSouth(stateOnLair({ playerArmy: 10 })) },
    ]

    for (const c of cases) {
      expect(c.opened.encounter?.kind, `${c.name}: encounter opened`).toBe('combat')
      const top = rightGrid(c.opened, 0, 1)
      expect(top.spriteId, `${c.name}: top slot uses gold sprite`).toBe(SPRITES.inventory.gold)
      expect(top.action, `${c.name}: top slot dispatches recruit/pay`).toEqual({ type: ACTION_COMBAT_PAY })
    }
  })

  // Brigand recruit succeeds when wounded and small (cost = N²,
  // partial loot scaled by killed ratio).
  //
  // Wounded (enemy < initialSpawn), small (enemy ≤ MAX_REMAINING=5), and
  // affordable (gold ≥ N²). Single-shot witnesses encounter close, troop
  // growth, and the success line. The Monte-Carlo block witnesses the
  // partial-loot envelope under noise: at N=3, initialSpawn=10, scale=0.7,
  // baseGold draw ∈ [7..13] → scaled loot ∈ [4..9] → net ∈ [-5..0].
  it('Brigand recruit succeeds with N² cost and partial loot', () => {
    const enemy = 3
    const initialSpawn = 10
    const gold = 50
    const cost = enemy * enemy // 9
    const inFight = brigandFightInProgress({ enemyArmySize: enemy, initialSpawn, gold, playerArmy: 8 })
    const armyBefore = inFight.resources.armySize

    const after = processAction(inFight, { type: ACTION_COMBAT_PAY })!
    expect(after.encounter).toBeNull()
    expect(after.resources.armySize).toBe(armyBefore + enemy)
    expect(BRIGAND_RECRUIT_SUCCESS_LINES).toContain(after.ui.message)

    const trials = 500
    const goldDeltas: number[] = []
    for (let trial = 0; trial < trials; trial++) {
      const trialState: State = {
        ...inFight,
        world: { ...inFight.world, rngState: inFight.world.rngState + trial * 1000003 },
      }
      const trialAfter = processAction(trialState, { type: ACTION_COMBAT_PAY })!
      goldDeltas.push(trialAfter.resources.gold - gold)
    }
    for (const delta of goldDeltas) {
      expect(delta).toBeGreaterThanOrEqual(-cost)
      expect(delta).toBeLessThanOrEqual(0)
    }
    const mean = goldDeltas.reduce((s, d) => s + d, 0) / trials
    // Analytic mean: floor(0.7·x) over x∈{7..13} averages 6.57; net = 6.57 - 9 ≈ -2.43.
    expect(mean).toBeGreaterThan(-3.5)
    expect(mean).toBeLessThan(-1.5)
  })

  // Recruit fails when band too large.
  //
  // enemyArmySize=6 trips the > BRIGAND_RECRUIT_MAX_REMAINING (=5) branch
  // before the wounded/funds checks, regardless of gold. Encounter must
  // survive intact (same wounded count, same source cell), no resource
  // spend, and the message picks from BRIGAND_RECRUIT_TOO_MANY_LINES.
  it('Recruit fails when band too large', () => {
    const inFight = brigandFightInProgress({ enemyArmySize: 6, initialSpawn: 10, gold: 20 })
    const goldBefore = inFight.resources.gold
    const armyBefore = inFight.resources.armySize

    const after = processAction(inFight, { type: ACTION_COMBAT_PAY })!
    expect(after.encounter?.kind).toBe('combat')
    expect((after.encounter as CombatEncounter).enemyArmySize).toBe(6)
    expect(after.resources.gold).toBe(goldBefore)
    expect(after.resources.armySize).toBe(armyBefore)
    expect(BRIGAND_RECRUIT_TOO_MANY_LINES).toContain(after.ui.message)
  })

  // Recruit fails when band unwounded.
  //
  // enemyArmySize === initialSpawn → the band hasn't been wounded yet.
  // Predicate returns 'notWounded' before the noFunds check; message
  // picks from BRIGAND_RECRUIT_NOT_WOUNDED_LINES.
  it('Recruit fails when band unwounded', () => {
    const inFight = brigandFightInProgress({ enemyArmySize: 4, initialSpawn: 4, gold: 20 })
    const goldBefore = inFight.resources.gold

    const after = processAction(inFight, { type: ACTION_COMBAT_PAY })!
    expect(after.encounter?.kind).toBe('combat')
    expect(after.resources.gold).toBe(goldBefore)
    expect(BRIGAND_RECRUIT_NOT_WOUNDED_LINES).toContain(after.ui.message)
  })

  // Recruit fails when player cannot afford.
  //
  // enemyArmySize=4 → cost = 4 gold; gold=2 falls short. Message picks
  // from BRIGAND_RECRUIT_NO_FUNDS_LINES; encounter persists.
  it('Recruit fails when player cannot afford', () => {
    const inFight = brigandFightInProgress({ enemyArmySize: 4, initialSpawn: 10, gold: 2 })
    const goldBefore = inFight.resources.gold

    const after = processAction(inFight, { type: ACTION_COMBAT_PAY })!
    expect(after.encounter?.kind).toBe('combat')
    expect(after.resources.gold).toBe(goldBefore)
    expect(BRIGAND_RECRUIT_NO_FUNDS_LINES).toContain(after.ui.message)
  })

  // Combat preview plate is minimal: enemy count + variant sprite, plus
  // a conditional recruit-cost row when payment is eligible. The plate
  // fits the TIC-80 column budget (3 chars × ~3 rows) and signals variant
  // identity through `variant.centerSpriteId` (brigand enemy vs goblin
  // sprite vs wyrm heart).
  it('Combat preview plate shows enemy count only when not recruit-eligible', () => {
    const previewPlate = MECHANIC_INDEX.previewPlateByEncounterKind.combat
    if (!previewPlate) throw new Error('no combat preview-plate registered')

    // Brigand at initialSpawn=10, enemy=6 → too many to recruit; plate
    // shows only the enemy-count row.
    {
      const initialSpawn = 10
      const enemyArmySize = 6
      const opened = stepSouth(stateOnMountainAmbush({ playerArmy: 5 }))
      const sourceCellId = (opened.encounter as CombatEncounter).sourceCellId
      const probe: State = {
        ...opened,
        resources: { ...opened.resources, gold: 100 },
        encounter: {
          kind: 'combat',
          enemyArmySize,
          initialSpawn,
          sourceCellId,
          restoreMessage: '',
        },
      }
      expect(previewPlate(probe)).toEqual([
        { spriteId: SPRITES.enemies.enemy, text: `${enemyArmySize}` },
      ])
    }

    // Goblin: never recruitable; plate is single-row with the goblin
    // sprite (sprite-per-variant correctness).
    {
      const initialSpawn = 10
      const enemyArmySize = 6
      const opened = stepSouth(stateOnWoodsAmbush({ playerArmy: 5 }))
      const sourceCellId = (opened.encounter as CombatEncounter).sourceCellId
      const probe: State = {
        ...opened,
        encounter: {
          kind: 'combat',
          enemyArmySize,
          initialSpawn,
          sourceCellId,
          restoreMessage: '',
        },
      }
      expect(previewPlate(probe)).toEqual([
        { spriteId: SPRITES.enemies.goblin, text: `${enemyArmySize}` },
      ])
    }

    // Henge at initialSpawn=20, enemy=20 → fresh band, not wounded;
    // plate is single-row.
    {
      const initialSpawn = 20
      const opened = stepSouth(stateOnHenge({ playerArmy: 5 }))
      const sourceCellId = (opened.encounter as CombatEncounter).sourceCellId
      const probe: State = {
        ...opened,
        encounter: {
          kind: 'combat',
          enemyArmySize: initialSpawn,
          initialSpawn,
          sourceCellId,
          restoreMessage: '',
        },
      }
      expect(previewPlate(probe)).toEqual([
        { spriteId: SPRITES.enemies.enemy, text: `${initialSpawn}` },
      ])
    }
  })

  it('Plate shows recruit cost row when wounded, small, and paid', () => {
    const previewPlate = MECHANIC_INDEX.previewPlateByEncounterKind.combat
    if (!previewPlate) throw new Error('no combat preview-plate registered')

    const initialSpawn = 12
    const enemyArmySize = 3 // wounded + small (≤5)
    const opened = stepSouth(stateOnMountainAmbush({ playerArmy: 5 }))
    const sourceCellId = (opened.encounter as CombatEncounter).sourceCellId
    const probe: State = {
      ...opened,
      resources: { ...opened.resources, gold: 100 }, // affordable
      encounter: {
        kind: 'combat',
        enemyArmySize,
        initialSpawn,
        sourceCellId,
        restoreMessage: '',
      },
    }
    expect(previewPlate(probe)).toEqual([
      { spriteId: SPRITES.enemies.enemy, text: `${enemyArmySize}` },
      { spriteId: SPRITES.inventory.gold, text: `-${enemyArmySize * enemyArmySize}` }, // "-9"
    ])
  })

  it('Plate hides recruit cost row when player cannot afford it', () => {
    const previewPlate = MECHANIC_INDEX.previewPlateByEncounterKind.combat
    if (!previewPlate) throw new Error('no combat preview-plate registered')

    const initialSpawn = 12
    const enemyArmySize = 5 // wounded + small but cost = 25
    const opened = stepSouth(stateOnMountainAmbush({ playerArmy: 5 }))
    const sourceCellId = (opened.encounter as CombatEncounter).sourceCellId
    const probe: State = {
      ...opened,
      resources: { ...opened.resources, gold: 10 }, // < 25, cannot afford
      encounter: {
        kind: 'combat',
        enemyArmySize,
        initialSpawn,
        sourceCellId,
        restoreMessage: '',
      },
    }
    expect(previewPlate(probe)).toEqual([
      { spriteId: SPRITES.enemies.enemy, text: `${enemyArmySize}` },
    ])
  })

  // ----------------------------------------------------------------
  // Food cap rule shift
  // ----------------------------------------------------------------

  // Combat losses must not retroactively trim food. Player at carry cap
  // (food=20, armySize=10 → cap=20) mid-fight: when a FIGHT round drops
  // armySize to 9 (cap drops to 18), food sticks at 20 because the
  // round didn't rise food. The over-cap-prev case is fully witnessed
  // at the unit level (foodCarry.test.ts).
  it('Combat shrinkage does not retroactively trim food', () => {
    const playerArmy = 10
    const enemyArmy = 20
    const sourceCellId = 1 * 3 + 1
    // Find a rngState where the first FIGHT round resolves to enemyHit:
    // the round draws w = intExclusive(playerArmy + 5), then b =
    // intExclusive(enemyArmy + 5); enemyHit fires when w < b.
    let rngStateForEnemyHit = -1
    for (let s = 1; s < 50000; s++) {
      const r = RNG.createStreamRandom(s)
      const w = r.intExclusive(playerArmy + 5)
      const b = r.intExclusive(enemyArmy + 5)
      if (w < b) {
        rngStateForEnemyHit = s
        break
      }
    }
    if (rngStateForEnemyHit < 0) throw new Error('no enemyHit seed found')

    const base = stateOnMountainAmbush({ playerArmy, food: 20, gold: 0 })
    const inFight: State = {
      ...base,
      player: { position: { x: 1, y: 1 } },
      world: { ...base.world, rngState: rngStateForEnemyHit },
      encounter: {
        kind: 'combat',
        enemyArmySize: enemyArmy,
        initialSpawn: enemyArmy,
        sourceCellId,
        restoreMessage: '',
      },
    }

    const after = processAction(inFight, { type: ACTION_FIGHT })!
    expect(after.encounter?.kind).toBe('combat')
    expect(after.resources.armySize).toBe(playerArmy - 1)
    // Cap dropped from 20 to 18, but the round did not rise food, so
    // food sticks at 20 (no retroactive shrink-clamp).
    expect(after.resources.food).toBe(20)
  })

  // Combat victory food gain is clamped at the current cap. Player
  // armySize=10, food=18 (cap=20) finishes off a 1-strong brigand band;
  // the round wins and fires a food bonus ≥ 3, but final food = cap = 20.
  it('Combat victory food gain is clamped at the current cap', () => {
    const playerArmy = 10
    const initialSpawn = 10
    const sourceCellId = 1 * 3 + 1
    // Find an rngState where:
    //   round 1 = playerHit (w >= b for playerArmy=10, enemyArmy=1),
    //   then brigandVictoryReward draws gold noise then food, producing
    //   foodBonus ≥ 3 so 18 + 3 ≥ 21 > cap=20.
    let rngStateForBigFood = -1
    for (let s = 1; s < 50000; s++) {
      const r = RNG.createStreamRandom(s)
      const w = r.intExclusive(playerArmy + 5)
      const b = r.intExclusive(1 + 5)
      if (w < b) continue
      r.intExclusive(2 * BRIGAND_GOLD_NOISE + 1)
      const foodBonus = r.intExclusive(BRIGAND_FOOD_MAX + 1)
      if (foodBonus >= 3) {
        rngStateForBigFood = s
        break
      }
    }
    if (rngStateForBigFood < 0) throw new Error('no big-food seed found')

    const base = stateOnMountainAmbush({ playerArmy, food: 18, gold: 0 })
    const inFight: State = {
      ...base,
      player: { position: { x: 1, y: 1 } },
      world: { ...base.world, rngState: rngStateForBigFood },
      encounter: {
        kind: 'combat',
        enemyArmySize: 1,
        initialSpawn,
        sourceCellId,
        restoreMessage: '',
      },
    }

    const cap = 2 * playerArmy
    const after = processAction(inFight, { type: ACTION_FIGHT })!
    expect(after.encounter).toBeNull()
    expect(after.resources.armySize).toBe(playerArmy)
    expect(after.resources.food).toBe(cap)
  })

  // ----------------------------------------------------------------
  // Ambush spawn floor widening
  // ----------------------------------------------------------------

  // Pre-v0.6 the spawn floor was `playerArmy`, which made small armies
  // (1..3 troops) always face a band ≥ playerArmy. The widened floor
  // `max(2, playerArmy - 2)` lets the early game sometimes roll a
  // fightable band; the ceiling stays `2 * playerArmy` so the upper
  // extreme is unchanged. The `Math.max(min, 2 * playerArmy)` guard
  // protects the playerArmy ∈ {0, 1} edge where `2 * playerArmy < min`.
  it('Ambush spawn floor widens — small player can roll small bands', () => {
    const sample = (playerArmy: number, trials: number) => {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      let sum = 0
      for (let s = 1; s <= trials; s++) {
        const { enemyArmy } = spawnEnemyArmy({ rngState: s, playerArmy })
        if (enemyArmy < min) min = enemyArmy
        if (enemyArmy > max) max = enemyArmy
        sum += enemyArmy
      }
      return { min, max, mean: sum / trials }
    }

    // playerArmy = 1 → fixed at 2 (floor and ceiling both = 2).
    const p1 = sample(1, 1000)
    expect(p1.min).toBe(2)
    expect(p1.max).toBe(2)

    // playerArmy = 2 → band ∈ [2..4].
    const p2 = sample(2, 5000)
    expect(p2.min).toBe(2)
    expect(p2.max).toBe(4)

    // playerArmy = 5 in woods → goblin band 3..10.
    const a = sample(5, 5000)
    expect(a.min).toBe(3)
    expect(a.max).toBe(10)
    expect(Math.abs(a.mean - 6.5)).toBeLessThan(0.3)

    // playerArmy = 3 in mountains → brigand band 2..6.
    const b = sample(3, 5000)
    expect(b.min).toBe(2)
    expect(b.max).toBe(6)
    expect(Math.abs(b.mean - 4)).toBeLessThan(0.3)
  })

  // After a successful henge recruit, the cell must empty
  // (`currentGroup = null`) AND start cooldown
  // (`nextReadyStep = stepCount + HENGE_COOLDOWN_MOVES`); the message
  // picks from `HENGE_RECRUIT_SUCCESS_LINES`.
  it('Henge recruit success empties cell and starts cooldown', () => {
    const enemy = 4
    const gold = 20
    const sourceCellId = 1 * 3 + 1
    const henge: HengeCell = {
      kind: 'henge',
      id: sourceCellId,
      name: 'The Mending',
      nextReadyStep: 0,
      currentGroup: 20,
    }
    const base = stateOnHenge({ hengeCell: henge, playerArmy: 50, gold, food: 50, stepCount: 7 })
    const inFight: State = {
      ...base,
      player: { position: { x: 1, y: 1 } },
      encounter: {
        kind: 'combat',
        enemyArmySize: enemy,
        initialSpawn: 20,
        sourceCellId,
        restoreMessage: '',
      },
    }
    const armyBefore = inFight.resources.armySize

    const after = processAction(inFight, { type: ACTION_COMBAT_PAY })!
    expect(after.encounter).toBeNull()
    expect(after.resources.armySize).toBe(armyBefore + enemy)
    // Cost = N² (4² = 16). Killed ratio (20-4)/20 = 80% scales the henge
    // victory reward (gold = max(0, 20+U[-3..3]) + 10 ∈ [27..33]). Scaled
    // loot = floor(0.8 · gold) ∈ [21..26] → net = scaled - 16 ∈ [+5..+10].
    // High-killed-ratio recruit at large henge bands net-profits — that's
    // design-consistent (see design § "Henge" recruit subsection).
    const netGoldDelta = after.resources.gold - gold
    expect(netGoldDelta).toBeGreaterThanOrEqual(5)
    expect(netGoldDelta).toBeLessThanOrEqual(10)

    const cellAfter = hengeCellAt(after, sourceCellId)
    expect(cellAfter.currentGroup).toBeNull()
    expect(cellAfter.nextReadyStep).toBe(after.run.stepCount + HENGE_COOLDOWN_MOVES)
    expect(HENGE_RECRUIT_SUCCESS_LINES).toContain(after.ui.message)
  })
})
