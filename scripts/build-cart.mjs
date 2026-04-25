import * as esbuild from 'esbuild'
import fs from 'node:fs/promises'
import path from 'node:path'

import { bannerText, footerText } from './cart-metadata.mjs'
import { validateCartOutput } from './validate-cart-output.mjs'
import { checkPortability } from './check-portability.mjs'

const entry = path.join(process.cwd(), 'src', 'platform', 'tic80', 'entry.ts')
const outfile = path.join(process.cwd(), 'the-unbound.js')

async function main() {
  const portability = await checkPortability()
  if (!portability.ok) {
    for (const e of portability.errors) console.error(e)
    process.exitCode = 1
    return
  }

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile,
    format: 'iife',
    target: ['es2020'],
    minify: false,
    sourcemap: false,
    banner: { js: bannerText() },
    footer: { js: footerText() },
    logLevel: 'info',
  })

  const out = await fs.readFile(outfile, 'utf8')
  const v = validateCartOutput(out)
  if (!v.ok) {
    for (const e of v.errors) console.error(e)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

