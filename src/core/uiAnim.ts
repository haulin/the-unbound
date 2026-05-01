import type { Anim, Ui } from './types'

export function enqueueAnim(ui: Ui, anim: Omit<Anim, 'id'>): Ui {
  const id = Math.max(1, Math.trunc(ui.anim.nextId))
  const a = { id, ...anim } as Anim
  const nextActive = ui.anim.active.concat([a])
  return {
    message: ui.message,
    leftPanel: ui.leftPanel,
    clock: ui.clock,
    anim: { nextId: id + 1, active: nextActive },
  }
}

