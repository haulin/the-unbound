export type DrawNineSliceFrameOptions = {
  tilePx?: number
  scale?: number
  colorkey?: number | number[]
  fallbackBorderColor?: number
}

function int(n: number) {
  return Math.floor(n)
}

function clampInt(n: number, min: number) {
  return Math.max(min, int(n))
}

function withClip(x: number, y: number, w: number, h: number, draw: () => void) {
  clip(x, y, w, h)
  draw()
  clip()
}

function drawTiledHoriz(spriteId: number, x: number, y: number, w: number, stepPx: number, colorkey: number | number[], scale: number) {
  for (let dx = 0; dx < w; dx += stepPx) spr(spriteId, x + dx, y, colorkey, scale)
}

function drawTiledVert(spriteId: number, x: number, y: number, h: number, stepPx: number, colorkey: number | number[], scale: number) {
  for (let dy = 0; dy < h; dy += stepPx) spr(spriteId, x, y + dy, colorkey, scale)
}

// Tile a 3x3 9-slice frame anchored at `topLeftSpriteId`. The frame is
// assumed to occupy a contiguous 3-wide x 3-tall block on the TIC-80 sprite
// sheet, so all 8 painted tiles follow positionally from the top-left and
// callers only ever need to pass that one id (center is left transparent for
// content):
//   tl  t  tr     -> tl+0,  tl+1,  tl+2
//   l   .  r      -> tl+16,        tl+18
//   bl  b  br     -> tl+32, tl+33, tl+34
// (+16 is the TIC-80 sprite-page width; each row stride is one sheet row.)
export function drawNineSliceFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  topLeftSpriteId: number,
  opts: DrawNineSliceFrameOptions = {}
) {
  const tilePx = clampInt(opts.tilePx ?? 8, 1)
  const scale = clampInt(opts.scale ?? 1, 1)
  const colorkey = opts.colorkey ?? 0

  const wPx = int(w)
  const hPx = int(h)
  if (wPx <= 0) return
  if (hPx <= 0) return

  const tileScreenPx = tilePx * scale

  // Small-box fallback: can't fit independent corners + edges.
  if (wPx < tileScreenPx * 2 || hPx < tileScreenPx * 2) {
    const c = opts.fallbackBorderColor
    if (c != null) rectb(x, y, wPx, hPx, c)
    return
  }

  const x0 = int(x)
  const y0 = int(y)
  const x1 = x0 + wPx - tileScreenPx
  const y1 = y0 + hPx - tileScreenPx
  const innerW = wPx - tileScreenPx * 2
  const innerH = hPx - tileScreenPx * 2

  const topRowStart = topLeftSpriteId
  const midRowStart = topLeftSpriteId + 16
  const botRowStart = topLeftSpriteId + 32

  // Corners
  spr(topRowStart, x0, y0, colorkey, scale)
  spr(topRowStart + 2, x1, y0, colorkey, scale)
  spr(botRowStart, x0, y1, colorkey, scale)
  spr(botRowStart + 2, x1, y1, colorkey, scale)

  // Top edge
  withClip(x0 + tileScreenPx, y0, innerW, tileScreenPx, () => {
    drawTiledHoriz(topRowStart + 1, x0 + tileScreenPx, y0, innerW, tileScreenPx, colorkey, scale)
  })

  // Bottom edge
  withClip(x0 + tileScreenPx, y1, innerW, tileScreenPx, () => {
    drawTiledHoriz(botRowStart + 1, x0 + tileScreenPx, y1, innerW, tileScreenPx, colorkey, scale)
  })

  // Left edge
  withClip(x0, y0 + tileScreenPx, tileScreenPx, innerH, () => {
    drawTiledVert(midRowStart, x0, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale)
  })

  // Right edge
  withClip(x1, y0 + tileScreenPx, tileScreenPx, innerH, () => {
    drawTiledVert(midRowStart + 2, x1, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale)
  })
}

