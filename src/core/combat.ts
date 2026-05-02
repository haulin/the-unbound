import { RNG } from './rng'

export function cellIdForPos(world: { width: number }, pos: { x: number; y: number }): number {
  return pos.y * world.width + pos.x
}

export function spawnEnemyArmy(opts: { rngState: number; playerArmy: number }): { rngState: number; enemyArmy: number } {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const maxExclusive = playerArmy + 1 // U[0..playerArmy]
  const r = RNG.createStreamRandom(opts.rngState)
  const delta = r.intExclusive(maxExclusive)
  return { rngState: r.rngState, enemyArmy: playerArmy + delta } // U[playerArmy..playerArmy*2]
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

  const r = RNG.createStreamRandom(opts.rngState)
  const w = r.intExclusive(playerArmy + 5)
  const b = r.intExclusive(enemyArmy + 5)

  if (w >= b) {
    const nextEnemyArmy = Math.floor(enemyArmy / 2)
    const killed = enemyArmy - nextEnemyArmy
    return {
      rngState: r.rngState,
      outcome: 'playerHit',
      nextEnemyArmy,
      enemyDelta: nextEnemyArmy - enemyArmy,
      killed,
    }
  }

  return {
    rngState: r.rngState,
    outcome: 'enemyHit',
    nextEnemyArmy: enemyArmy,
    enemyDelta: 0,
    killed: 0,
  }
}

