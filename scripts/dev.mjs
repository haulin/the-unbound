import { spawn } from 'node:child_process'
import path from 'node:path'

function run(cmd, args) {
  return spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
}

const isWin = process.platform === 'win32'
const tscBin = path.join('node_modules', '.bin', isWin ? 'tsc.cmd' : 'tsc')

const procs = [
  run(tscBin, ['-p', 'tsconfig.json', '--noEmit', '--watch', '--preserveWatchOutput']),
  // Use Node's watch mode so changes to build scripts (e.g. cart-metadata) restart the bundler watcher.
  // `--watch-preserve-output` keeps prior logs visible across restarts.
  run(process.execPath, ['--watch', '--watch-preserve-output', 'scripts/watch-cart.mjs']),
]

function shutdown(code = 0) {
  for (const p of procs) {
    try {
      p.kill('SIGINT')
    } catch {}
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

