// Minimal ambient typings so the terminal platform compiles without
// pulling in `@types/node`. Only the surface we actually touch.

declare const process: {
  stdin: {
    setRawMode?: (mode: boolean) => unknown
    resume: () => unknown
    on: (event: string, listener: (chunk: { toString(): string }) => void) => unknown
    isTTY?: boolean
  }
  stdout: { write: (s: string) => unknown }
  exit: (code?: number) => unknown
  argv: string[]
  env: Record<string, string | undefined>
}

declare const console: {
  log: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}
