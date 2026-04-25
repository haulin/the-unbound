import * as esbuild from 'esbuild'
import fsp from 'node:fs/promises'
import path from 'node:path'

import { bannerText, footerText } from './cart-metadata.mjs'
import { validateCartOutput } from './validate-cart-output.mjs'
import { checkPortability } from './check-portability.mjs'

const entry = path.join(process.cwd(), 'src', 'platform', 'tic80', 'entry.ts')
const outfile = path.join(process.cwd(), 'the-unbound.js')

async function validateIfPossible() {
  try {
    const out = await fsp.readFile(outfile, 'utf8')
    const v = validateCartOutput(out)
    if (!v.ok) {
      console.error('[cart-validate] failed:')
      for (const e of v.errors) console.error(`- ${e}`)
    } else {
      console.log('[cart-validate] ok')
    }
  } catch {
    // ignore during bootstrap/failed builds
  }
}

async function portabilityIfPossible() {
  const p = await checkPortability()
  if (!p.ok) {
    console.error('[portability] failed:')
    for (const e of p.errors) console.error(`- ${e}`)
  }
}

async function main() {
  const postBuildChecks = {
    name: 'postBuildChecks',
    setup(build) {
      build.onEnd(async (result) => {
        // Keep running through temporary errors: only validate on successful builds.
        if (!result || (result.errors && result.errors.length)) return
        await portabilityIfPossible()
        await validateIfPossible()
      })
    },
  }

  const ctx = await esbuild.context({
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
    plugins: [postBuildChecks],
  })

  await ctx.watch()
  console.log('[watch] watching for changes…')

  // Keep process alive.
  await new Promise(() => {})
}

main().catch((e) => {
  // If bootstrapping fails (missing entry file), keep a clear error.
  console.error(e)
  process.exitCode = 1
})

