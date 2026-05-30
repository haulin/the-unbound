import * as esbuild from 'esbuild'
import { spawn } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const entry = path.join(root, 'src', 'platform', 'terminal', 'entry.ts')
const outfile = path.join(root, 'dist', 'terminal.cjs')

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  outfile,
  format: 'cjs',
  platform: 'node',
  target: ['node18'],
  sourcemap: false,
  logLevel: 'warning',
})

// Forward CLI args (e.g. --seed=42) to the built bundle, and inherit stdio so
// raw-mode keystrokes flow straight through.
const child = spawn(process.execPath, [outfile, ...process.argv.slice(2)], {
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
