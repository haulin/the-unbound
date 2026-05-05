import type { Cell, CellGrid, Vec2, World } from './types'

export function getCellAt(world: World, pos: Vec2): Cell {
  return world.cells[pos.y]![pos.x]!
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

