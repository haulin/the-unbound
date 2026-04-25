import { describe, expect, it } from 'vitest'
import {
  FARM_COUNT,
  SIGNPOST_COUNT,
  TILE_CASTLE,
  TILE_FARM,
  TILE_SIGNPOST,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../src/core/constants'
import { countTiles, generateWorld } from '../../src/core/world'

describe('world', () => {
  it('has correct dimensions and specials', () => {
    const g = generateWorld(1)
    expect(g.world.width).toBe(WORLD_WIDTH)
    expect(g.world.height).toBe(WORLD_HEIGHT)
    expect(g.world.tiles.length).toBe(WORLD_HEIGHT)
    expect(g.world.tiles[0]?.length).toBe(WORLD_WIDTH)

    expect(countTiles(g.world.tiles, TILE_CASTLE)).toBe(1)
    expect(countTiles(g.world.tiles, TILE_FARM)).toBe(FARM_COUNT)
    expect(countTiles(g.world.tiles, TILE_SIGNPOST)).toBe(SIGNPOST_COUNT)
    expect(g.world.tiles[g.world.castlePosition.y][g.world.castlePosition.x]).toBe(TILE_CASTLE)

    expect(g.world.farms.length).toBe(FARM_COUNT)
    expect(new Set(g.world.farms.map((f) => f.name)).size).toBe(FARM_COUNT)
    expect(new Set(g.world.farms.map((f) => `${f.position.x},${f.position.y}`)).size).toBe(FARM_COUNT)
    for (const f of g.world.farms) {
      expect(g.world.tiles[f.position.y]![f.position.x]!).toBe(TILE_FARM)
    }
  })

  it('is deterministic by seed', () => {
    const a = generateWorld(1)
    const b = generateWorld(1)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

