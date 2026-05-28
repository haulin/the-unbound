import { describe, expect, it } from 'vitest'
import { generateWorld } from '../../src/core/world'
import type { Cell, World } from '../../src/core/types'

// Locks the worldgen RNG-draw shape across migrations. If you intentionally
// change placer order or how a placer consumes RNG, regenerate the snapshot.

const SEEDS = [12345, 999, 1] as const

function cellSignature(cell: Cell): string {
  switch (cell.kind) {
    case 'gate':
    case 'gateOpen':
    case 'locksmith':
    case 'signpost':
    case 'grass':
    case 'road':
    case 'mountain':
    case 'swamp':
    case 'woods':
      return cell.kind
    case 'farm':
      return `farm:${cell.id}:${cell.name}:beast=${cell.beastGoldCost}`
    case 'camp':
      return `camp:${cell.id}:${cell.name}:ready=${cell.nextReadyStep}`
    case 'henge':
      return `henge:${cell.id}:${cell.name}:ready=${cell.nextReadyStep}`
    case 'town': {
      const offers = cell.offers.join(',')
      const p = cell.prices
      return `town:${cell.id}:${cell.name}:offers=[${offers}]:prices=${p.foodGold}/${p.troopsGold}/${p.scoutGold}/${p.rumorGold}`
    }
    case 'fishingLake':
      return `fishingLake:${cell.id}:ready=${cell.nextReadyStep}`
    case 'rainbowEnd':
      return `rainbowEnd:${cell.id}:paid=${cell.hasPaidOut}`
  }
}

const TERRAIN_KINDS = new Set(['grass', 'road', 'mountain', 'swamp', 'woods'])

function serializeFeatures(world: World): string[] {
  const lines: string[] = []
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const cell = world.cells[y]![x]!
      if (TERRAIN_KINDS.has(cell.kind)) continue
      lines.push(`(${x},${y}) ${cellSignature(cell)}`)
    }
  }
  return lines
}

function serializeTerrainHistogram(world: World): Record<string, number> {
  const hist: Record<string, number> = {}
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const k = world.cells[y]![x]!.kind
      if (!TERRAIN_KINDS.has(k)) continue
      hist[k] = (hist[k] ?? 0) + 1
    }
  }
  return hist
}

function serializeWorld(seed: number) {
  const gen = generateWorld(seed)
  return {
    seed,
    width: gen.world.width,
    height: gen.world.height,
    mapGenAlgorithm: gen.world.mapGenAlgorithm,
    finalRngState: gen.world.rngState,
    startPosition: gen.startPosition,
    terrainHistogram: serializeTerrainHistogram(gen.world),
    features: serializeFeatures(gen.world),
  }
}

describe('world generation determinism', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: layout matches golden`, () => {
      expect(serializeWorld(seed)).toMatchSnapshot()
    })
  }
})
