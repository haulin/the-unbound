import { spriteIdForKind } from './constants'
import { wrapIndex } from './math'
import type { Cell, CellGrid, CellKind, Vec2, World } from './types'

export function getCellAt(world: World, pos: Vec2): Cell {
  return world.cells[pos.y]![pos.x]!
}

// Wrap-aware sprite lookup for arbitrary (x, y). Renderers and right-grid
// previews use this with offsets that can fall outside the world bounds; the
// torus wrap keeps them on the map.
export function getSpriteIdAt(world: World, x: number, y: number): number {
  const tx = wrapIndex(x, world.width)
  const ty = wrapIndex(y, world.height)
  const cell = world.cells[ty]![tx]!
  return spriteIdForKind(cell.kind)
}

export function cellIdForPos(world: { width: number }, pos: Vec2): number {
  return pos.y * world.width + pos.x
}

export function setCellAt(world: World, pos: Vec2, nextCell: Cell): World {
  const cells = world.cells
  const row = cells[pos.y]!

  const nextRow: Cell[] = row.slice()
  nextRow[pos.x] = nextCell

  const nextCells: CellGrid = cells.slice()
  nextCells[pos.y] = nextRow

  return { ...world, cells: nextCells }
}

// Find the position of the first cell matching `kind` in row-major order. Used by
// peer-aware worldgen placers (e.g. gate inspects whether the locksmith was
// already placed, and vice versa). Returns null when no such cell is found.
export function findCellByKind(cells: CellGrid, kind: CellKind): Vec2 | null {
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]!
    for (let x = 0; x < row.length; x++) {
      if (row[x]!.kind === kind) return { x, y }
    }
  }
  return null
}

