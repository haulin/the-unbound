export type NineSlice3x3 = {
  tl: number
  t: number
  tr: number
  l: number
  c: number
  r: number
  bl: number
  b: number
  br: number
}

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

export function drawNineSliceFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  sprites: NineSlice3x3,
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

  // Corners
  spr(sprites.tl, x0, y0, colorkey, scale)
  spr(sprites.tr, x1, y0, colorkey, scale)
  spr(sprites.bl, x0, y1, colorkey, scale)
  spr(sprites.br, x1, y1, colorkey, scale)

  // Top edge
  withClip(x0 + tileScreenPx, y0, innerW, tileScreenPx, () => {
    drawTiledHoriz(sprites.t, x0 + tileScreenPx, y0, innerW, tileScreenPx, colorkey, scale)
  })

  // Bottom edge
  withClip(x0 + tileScreenPx, y1, innerW, tileScreenPx, () => {
    drawTiledHoriz(sprites.b, x0 + tileScreenPx, y1, innerW, tileScreenPx, colorkey, scale)
  })

  // Left edge
  withClip(x0, y0 + tileScreenPx, tileScreenPx, innerH, () => {
    drawTiledVert(sprites.l, x0, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale)
  })

  // Right edge
  withClip(x1, y0 + tileScreenPx, tileScreenPx, innerH, () => {
    drawTiledVert(sprites.r, x1, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale)
  })
}

