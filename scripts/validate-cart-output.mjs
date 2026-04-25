import { licenseLines, metadataBlockLines } from './cart-metadata.mjs'

function normalizeLineEndings(s) {
  return String(s).replace(/\r\n/g, '\n')
}

function trimFinalNewlines(s) {
  return String(s).replace(/\n+$/g, '')
}

export function validateCartOutput(sourceText) {
  const src = normalizeLineEndings(sourceText)
  const trimmed = trimFinalNewlines(src)
  const errors = []

  // Entry contract: the bundled output must register global TIC().
  if (!/\.TIC\s*=\s*TIC\b/.test(trimmed)) {
    errors.push('Missing global TIC registration (expected ".TIC = TIC").')
  }

  // Validate header/footer against the source-of-truth metadata builder.
  // Since we keep version only in cart-metadata, this is stable.
  const metaLines = metadataBlockLines()
  const metaBlock = metaLines.join('\n')
  const licLines = licenseLines()

  if (!trimmed.startsWith(metaBlock)) errors.push('Cart does not start with the expected metadata block.')
  if (!trimmed.endsWith(metaBlock)) errors.push('Cart does not end with the expected metadata block (EOF repeat).')

  {
    const lines = trimmed.split('\n')
    const expectedPrefix = metaLines.concat(['']).concat(licLines)
    const actualPrefix = lines.slice(0, expectedPrefix.length)
    for (let i = 0; i < expectedPrefix.length; i++) {
      if (actualPrefix[i] !== expectedPrefix[i]) {
        errors.push('License block is missing or not immediately after the metadata header.')
        break
      }
    }
  }

  // Count only metadata-style lines at line starts. This is what the TIC parser seems to care about.
  const keys = ['title', 'author', 'desc', 'script', 'input']
  for (const k of keys) {
    const re = new RegExp(`^//\\s*${k}\\s*:`, 'gm')
    const m = trimmed.match(re)
    const n = m ? m.length : 0
    if (n !== 2) errors.push(`Expected exactly 2 '${k}:' metadata lines (header + footer), found ${n}.`)
  }

  return { ok: errors.length === 0, errors }
}

