import { ACTION_NEW_RUN, ACTION_TICK, INITIAL_SEED } from '../../core/constants'
import { hasBlockingAnim } from '../../core/reducer'
import { processAction } from '../../core/processAction'
import type { State } from '../../core/types'
import { actionForClick, sampleMouse } from './input'
import { renderFrame } from './render'

let state: State | null = null
let prevMouseLeftDown = false

export function TIC() {
  const { mouseX, mouseY, mouseLeftDown } = sampleMouse()
  const justPressed = mouseLeftDown && !prevMouseLeftDown
  prevMouseLeftDown = mouseLeftDown

  if (state == null) state = processAction(null, { type: ACTION_NEW_RUN, seed: INITIAL_SEED })
  if (state == null) return

  state = processAction(state, { type: ACTION_TICK })
  if (state == null) return

  if (justPressed && !hasBlockingAnim(state.ui)) {
    const action = actionForClick(state, mouseX, mouseY)
    if (action) {
      const next = processAction(state, action)
      if (next) state = next
    }
  }

  renderFrame(state)
}

;(globalThis as any).TIC = TIC

