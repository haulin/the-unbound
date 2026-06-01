// Combat balance Monte Carlo for v0.6 brainstorming.
//
// Mirrors the round math in `src/core/mechanics/defs/combat.ts`
// (`resolveFightRound`) but parametrizes the +5/+5 floor as
// `playerRollBonus` / `enemyRollBonus` so we can compare brigand
// (current) vs goblin (proposed weaker) without touching core code.
//
// Run: `node scripts/combat-sim.mjs`
// No deps. Math.random is fine for distribution-only stats.

const TRIALS = 10000

function simulateFight({ playerArmy, enemyArmy, playerRollBonus, enemyRollBonus }) {
  let p = playerArmy
  let e = enemyArmy
  let rounds = 0
  while (p > 0 && e > 0) {
    rounds += 1
    const w = Math.floor(Math.random() * (p + playerRollBonus))
    const b = Math.floor(Math.random() * (e + enemyRollBonus))
    if (w >= b) {
      e = Math.floor(e / 2)
    } else {
      p -= 1
    }
  }
  return { won: p > 0, rounds, troopsLost: playerArmy - p, finalArmy: p, finalEnemy: e }
}

function pct(n) { return (n * 100).toFixed(1) + '%' }
function n(x, d = 1) { return x.toFixed(d) }

function quantile(sorted, q) {
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q))
  return sorted[idx]
}

function runMatrix({ label, playerRollBonus, enemyRollBonus, ratios }) {
  console.log(`\n=== ${label}  (player roll +${playerRollBonus}, enemy roll +${enemyRollBonus}) ===`)
  console.log('p\\e   |  ratio  | winRate | medRnds | p95Rnds | medLost | meanLost(win)')
  console.log('------+---------+---------+---------+---------+---------+--------------')
  const playerArmies = [3, 5, 7, 10, 15, 20]
  for (const p of playerArmies) {
    for (const r of ratios) {
      const e = Math.max(1, Math.round(p * r))
      let wins = 0
      const roundsArr = []
      const lostArr = []
      const lostWinsArr = []
      for (let i = 0; i < TRIALS; i++) {
        const out = simulateFight({ playerArmy: p, enemyArmy: e, playerRollBonus, enemyRollBonus })
        if (out.won) {
          wins += 1
          lostWinsArr.push(out.troopsLost)
        }
        roundsArr.push(out.rounds)
        lostArr.push(out.troopsLost)
      }
      roundsArr.sort((a, b) => a - b)
      lostArr.sort((a, b) => a - b)
      const winRate = wins / TRIALS
      const medRounds = quantile(roundsArr, 0.5)
      const p95Rounds = quantile(roundsArr, 0.95)
      const medLost = quantile(lostArr, 0.5)
      const meanLostWins = lostWinsArr.length ? lostWinsArr.reduce((s, x) => s + x, 0) / lostWinsArr.length : NaN
      console.log(
        `${String(p).padStart(2)}v${String(e).padEnd(3)}|  ${r.toFixed(2)}x  |  ${pct(winRate).padStart(5)}  |  ${String(medRounds).padStart(5)}  |  ${String(p95Rounds).padStart(5)}  |  ${String(medLost).padStart(5)}  |  ${Number.isNaN(meanLostWins) ? '   --' : n(meanLostWins, 2).padStart(5)}`,
      )
    }
    console.log('------+---------+---------+---------+---------+---------+--------------')
  }
}

const RATIOS = [1.0, 1.5, 2.0, 3.0]

runMatrix({ label: 'BRIGAND (current = +5/+5)', playerRollBonus: 5, enemyRollBonus: 5, ratios: RATIOS })
runMatrix({ label: 'GOBLIN (+6/+3)', playerRollBonus: 6, enemyRollBonus: 3, ratios: RATIOS })
runMatrix({ label: 'GOBLIN (+7/+3 — earlier proposal)', playerRollBonus: 7, enemyRollBonus: 3, ratios: RATIOS })

// Reward expectations:
//   Brigand: gold ≈ N ± 3, food U[0..4]
//   Goblin:  gold U[0..2], food ≈ round(0.4·N) ± 1
//   Henge:   gold ≈ N ± 3 + 10, food ≈ round(0.2·N) ± 1
// At expected-spawn (uniform mid-point), what does the player gross?
function rewardExpectation({ label, formula, spawnRange }) {
  const samples = []
  for (let i = 0; i < TRIALS; i++) {
    const spawn = spawnRange[0] + Math.floor(Math.random() * (spawnRange[1] - spawnRange[0] + 1))
    samples.push({ spawn, ...formula(spawn) })
  }
  const meanGold = samples.reduce((s, x) => s + x.gold, 0) / samples.length
  const meanFood = samples.reduce((s, x) => s + x.food, 0) / samples.length
  const meanSpawn = samples.reduce((s, x) => s + x.spawn, 0) / samples.length
  console.log(`${label.padEnd(28)} mean spawn ${n(meanSpawn)}  mean gold ${n(meanGold, 2)}  mean food ${n(meanFood, 2)}`)
}

console.log('\n=== Reward expectation (shipped formulas) ===')
// Constants — duplicated by hand because the sim runs outside the
// TypeScript build and can't import the runtime module.
const BRIGAND_GOLD_NOISE = 3         // gold = N + U[-3..3]
const BRIGAND_FOOD_MAX = 4           // food = U[0..4]
const GOBLIN_GOLD_MAX = 2            // U[0..2]
const GOBLIN_FOOD_FACTOR = 0.4       // food center = round(0.4·N)
const GOBLIN_FOOD_NOISE = 1
const HENGE_GOLD_NOISE = 3
const HENGE_GOLD_BONUS = 10
const HENGE_FOOD_FACTOR = 0.2
const HENGE_FOOD_NOISE = 1

const intExclusive = (n) => Math.floor(Math.random() * n)

const brigandReward = (spawn) => {
  const noise = intExclusive(2 * BRIGAND_GOLD_NOISE + 1) - BRIGAND_GOLD_NOISE
  return {
    gold: Math.max(0, spawn + noise),
    food: intExclusive(BRIGAND_FOOD_MAX + 1),
  }
}
const goblinReward = (spawn) => {
  const noise = intExclusive(2 * GOBLIN_FOOD_NOISE + 1) - GOBLIN_FOOD_NOISE
  return {
    gold: intExclusive(GOBLIN_GOLD_MAX + 1),
    food: Math.max(0, Math.round(GOBLIN_FOOD_FACTOR * spawn) + noise),
  }
}
const hengeReward = (spawn) => {
  const goldNoise = intExclusive(2 * HENGE_GOLD_NOISE + 1) - HENGE_GOLD_NOISE
  const foodNoise = intExclusive(2 * HENGE_FOOD_NOISE + 1) - HENGE_FOOD_NOISE
  return {
    gold: Math.max(0, spawn + goldNoise) + HENGE_GOLD_BONUS,
    food: Math.max(0, Math.round(HENGE_FOOD_FACTOR * spawn) + foodNoise),
  }
}

rewardExpectation({ label: 'Brigand (4..14)',  formula: brigandReward, spawnRange: [4, 14] })
rewardExpectation({ label: 'Brigand (8..20)',  formula: brigandReward, spawnRange: [8, 20] })
rewardExpectation({ label: 'Goblin  (3..10)',  formula: goblinReward,  spawnRange: [3, 10] })
rewardExpectation({ label: 'Goblin  (8..20)',  formula: goblinReward,  spawnRange: [8, 20] })
rewardExpectation({ label: 'Henge   (10..30)', formula: hengeReward,   spawnRange: [10, 30] })
rewardExpectation({ label: 'Henge   (10..40)', formula: hengeReward,   spawnRange: [10, 40] })

// ---- Recruit decision curve (brigand + henge) -----------------------------
//
// At a given (initialSpawn, currentN) state, compare the three player choices:
//   - Flee:    cost 1 troop; no gain.
//   - Finish:  fight the rest, expected troops lost ≈ N * meanLossRate; gain
//              full reward (we sample the shipped formula).
//   - Recruit: pay N² gold; gain N troops; gain partial loot scaled by
//              killed ratio = (initialSpawn - N) / initialSpawn.
//
// The decision is interesting only when the three rows are different at the
// recruit-eligible window (N=1..5).

console.log('\n=== Recruit decision curve (cost=N², M1 partial loot) ===')

function recruitDecisionRow({ variant, initialSpawn, n, reward }) {
  const cost = n * n
  const scale = (initialSpawn - n) / initialSpawn
  const samples = 2000
  let goldFleeSum = 0, foodFleeSum = 0, troopFleeSum = 0
  let goldFinishSum = 0, foodFinishSum = 0, troopFinishSum = 0
  let goldRecruitSum = 0, foodRecruitSum = 0, troopRecruitSum = 0
  for (let i = 0; i < samples; i++) {
    // Flee: -1 troop, 0 reward.
    troopFleeSum -= 1
    // Finish: simulate clearing the remaining N enemies. Re-use simulateFight
    // with player=10 (representative mid-run) so loss rate is comparable.
    const fight = simulateFight({
      playerArmy: 10,
      enemyArmy: n,
      playerRollBonus: variant === 'brigand' || variant === 'henge' ? 5 : 6,
      enemyRollBonus: variant === 'goblin' ? 3 : 5,
    })
    if (fight.won) {
      const r = reward(initialSpawn) // reward draws on initialSpawn, not currentN
      goldFinishSum += r.gold
      foodFinishSum += r.food
      troopFinishSum -= fight.troopsLost
    } else {
      // Loss path: rare at N≤5 vs player=10, but treat as -1 troop / 0 reward
      // for the row average (keeps numbers comparable).
      troopFinishSum -= 1
    }
    // Recruit: -N² gold, +N troops, partial loot.
    const r = reward(initialSpawn)
    goldRecruitSum += -cost + Math.floor(r.gold * scale)
    foodRecruitSum += Math.floor(r.food * scale)
    troopRecruitSum += n
  }
  const fmt = (sum, dp = 1) => (sum / samples).toFixed(dp).padStart(6)
  console.log(
    `${variant.padEnd(7)} | spawn=${String(initialSpawn).padStart(2)} N=${n} | flee: trp ${fmt(troopFleeSum)} g ${fmt(goldFleeSum)} f ${fmt(foodFleeSum)} | finish: trp ${fmt(troopFinishSum, 2)} g ${fmt(goldFinishSum)} f ${fmt(foodFinishSum)} | recruit: trp ${fmt(troopRecruitSum, 2)} g ${fmt(goldRecruitSum)} f ${fmt(foodRecruitSum)}`
  )
}

console.log('Player=10 troops baseline. "trp/g/f" = avg troops/gold/food delta for that choice.')
console.log('-'.repeat(140))
for (const spawn of [10, 14, 20, 30]) {
  for (const n of [1, 2, 3, 4, 5]) {
    recruitDecisionRow({ variant: 'brigand', initialSpawn: spawn, n, reward: brigandReward })
  }
  console.log('-'.repeat(140))
}
console.log('Henge variant (bands 10..40):')
console.log('-'.repeat(140))
for (const spawn of [10, 20, 30, 40]) {
  for (const n of [1, 2, 3, 4, 5]) {
    recruitDecisionRow({ variant: 'henge', initialSpawn: spawn, n, reward: hengeReward })
  }
  console.log('-'.repeat(140))
}
