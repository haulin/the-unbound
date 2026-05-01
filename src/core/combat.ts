import { COMBAT_ENCOUNTER_LINES, COMBAT_FLEE_EXIT_LINES, COMBAT_VICTORY_EXIT_LINES } from './constants'
import { pickFromPool, pickIndex, randInt } from './prng'

export function cellIdForPos(world: { width: number }, pos: { x: number; y: number }): number {
  return pos.y * world.width + pos.x
}

export function encounterFlavorIndex(opts: { seed: number; stepCount: number; cellId: number }): number {
  return pickIndex({ seed: opts.seed, stepCount: opts.stepCount, cellId: opts.cellId }, COMBAT_ENCOUNTER_LINES.length)
}

export function pickCombatEncounterLine(opts: { seed: number; stepCount: number; cellId: number }): string {
  const idx = encounterFlavorIndex(opts)
  return COMBAT_ENCOUNTER_LINES[idx] || COMBAT_ENCOUNTER_LINES[0] || ''
}

export function pickCombatExitLine(opts: {
  seed: number
  stepCount: number
  cellId: number
  outcome: 'flee' | 'victory'
}): string {
  const pool = opts.outcome === 'victory' ? COMBAT_VICTORY_EXIT_LINES : COMBAT_FLEE_EXIT_LINES
  const salt = opts.outcome === 'victory' ? 0x9e3779b9 : 0x85ebca6b
  return pickFromPool({ seed: opts.seed, stepCount: opts.stepCount, cellId: opts.cellId, salt }, pool) || pool[0] || ''
}

export function spawnEnemyArmy(opts: { rngState: number; playerArmy: number }): { rngState: number; enemyArmy: number } {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const maxExclusive = playerArmy + 1 // U[0..playerArmy]
  const r = randInt(opts.rngState, maxExclusive)
  return { rngState: r.rngState, enemyArmy: playerArmy + r.value } // U[playerArmy..playerArmy*2]
}

export function resolveFightRound(opts: {
  rngState: number
  playerArmy: number
  enemyArmy: number
}):
  | {
      rngState: number
      outcome: 'playerHit'
      nextEnemyArmy: number
      enemyDelta: number
      killed: number
    }
  | {
      rngState: number
      outcome: 'enemyHit'
      nextEnemyArmy: number
      enemyDelta: number
      killed: number
    } {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const enemyArmy = Math.max(0, Math.trunc(opts.enemyArmy))

  const w = randInt(opts.rngState, playerArmy + 5)
  const b = randInt(w.rngState, enemyArmy + 5)

  if (w.value >= b.value) {
    const nextEnemyArmy = Math.floor(enemyArmy / 2)
    const killed = enemyArmy - nextEnemyArmy
    return {
      rngState: b.rngState,
      outcome: 'playerHit',
      nextEnemyArmy,
      enemyDelta: nextEnemyArmy - enemyArmy,
      killed,
    }
  }

  return {
    rngState: b.rngState,
    outcome: 'enemyHit',
    nextEnemyArmy: enemyArmy,
    enemyDelta: 0,
    killed: 0,
  }
}

