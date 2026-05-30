import { ACTION_MOVE } from '../../core/constants'
import type { Action } from '../../core/types'

function compass(dx: number, dy: number): string {
  if (dy < 0) return 'n'
  if (dy > 0) return 's'
  if (dx < 0) return 'w'
  if (dx > 0) return 'e'
  return '?'
}

// Display-only: snake_case the camelCase action ids (town offers are camelCase;
// everything else is SCREAMING_SNAKE), then lowercase. MOVE is the only action
// whose payload (dx/dy) is meaningful at the button level.
export function labelForAction(a: Action): string {
  if (a.type === ACTION_MOVE) return `move_${compass(a.dx, a.dy)}`
  return a.type.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}
