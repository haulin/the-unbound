import { ACTION_NEW_RUN, INITIAL_SEED } from '../../core/constants'
import { processAction } from '../../core/processAction'
import type { State } from '../../core/types'
import {
  hasBlockingAnim,
  initialTic80Ui,
  tickTic80Ui,
  translatePendingEvents,
  type Tic80UiState,
} from './anim'
import { actionForClick, deriveRenderHints, sampleMouse } from './input'
import { renderFrame } from './render'

let state: State | null = null
let tic80Ui: Tic80UiState = initialTic80Ui()
let prevMouseLeftDown = false

export function TIC() {
  const { mouseX, mouseY, mouseLeftDown } = sampleMouse()
  const justPressed = mouseLeftDown && !prevMouseLeftDown
  prevMouseLeftDown = mouseLeftDown

  if (state == null) {
    state = processAction(null, { type: ACTION_NEW_RUN, seed: INITIAL_SEED })
    if (state) tic80Ui = translatePendingEvents(tic80Ui, state.pendingEvents)
  }
  if (state == null) return

  tic80Ui = tickTic80Ui(tic80Ui)

  if (justPressed && !hasBlockingAnim(tic80Ui)) {
    const action = actionForClick(state, mouseX, mouseY)
    if (action) {
      const next = processAction(state, action)
      if (next) {
        state = next
        tic80Ui = translatePendingEvents(tic80Ui, state.pendingEvents)
      }
    }
  }

  const hints = deriveRenderHints(state, mouseX, mouseY)
  renderFrame({ state, ui: tic80Ui, hints })
}

;(globalThis as unknown as { TIC: typeof TIC }).TIC = TIC
