import fs from 'node:fs/promises'
import path from 'node:path'

async function listFilesRecursive(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await listFilesRecursive(p)))
    else out.push(p)
  }
  return out
}

const TIC80_API_NAMES = ['spr', 'pix', 'mouse', 'print', 'rect', 'rectb', 'cls']

export async function checkPortability({ rootDir = process.cwd() } = {}) {
  const coreDir = path.join(rootDir, 'src', 'core')
  let files = []
  try {
    files = (await listFilesRecursive(coreDir)).filter((p) => p.endsWith('.ts'))
  } catch {
    // If core doesn’t exist yet, treat as ok in early bootstrap.
    return { ok: true, errors: [] }
  }

  const errors = []

  for (const file of files) {
    const rel = path.relative(rootDir, file)
    const text = await fs.readFile(file, 'utf8')

    if (/from\s+['"][^'"]*\/platform\/[^'"]*['"]/.test(text) || /from\s+['"]\.\.\/platform\//.test(text)) {
      errors.push(`${rel}: core must not import from src/platform/**`)
    }

    for (const api of TIC80_API_NAMES) {
      const re = new RegExp(`\\b${api}\\s*\\(`, 'g')
      if (re.test(text)) errors.push(`${rel}: core must not call TIC-80 API '${api}()'`)
    }
  }

  return { ok: errors.length === 0, errors }
}

