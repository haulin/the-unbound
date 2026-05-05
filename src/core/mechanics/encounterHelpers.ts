// Shared helpers used by encounter mechanic defs (camp, town, farm, locksmith).
// Must NOT import MECHANIC_INDEX or any def-level module — would create a cycle, since
// MECHANIC_INDEX itself is built from the defs that import this file.

import { ENABLE_ANIMATIONS, TOWN_NO_GOLD_LINES } from '../constants'
import { RNG } from '../rng'
import type {
  DeltaAnimTarget,
  Encounter,
  Resources,
  Run,
  State,
  Ui,
} from '../types'
import { enqueueDeltas, enqueueGridTransition } from '../uiAnim'
import type { AnimSpec, GridFromKind } from './types'

// ---- Message + encounter scaffolding ------------------------------------------

// Replace the UI message with "<prefix>\n<line>".
export function setEncounterMessage(state: State, prefix: string, line: string): State {
  return { ...state, ui: { ...state.ui, message: `${prefix}\n${line}` } }
}

// Standard "you don't have enough gold" response: picks a per-move line from the shared
// TOWN_NO_GOLD_LINES pool (used today by town/farm/locksmith — the same lore is reused
// across all three since the player-facing concept is the same). Sets the encounter
// message; no resource changes.
export function noGoldResponse(state: State, prefix: string, cellId: number): State {
  const rnd = RNG.createRunCopyRandom(state)
  const line = rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId })
  return setEncounterMessage(state, prefix, line)
}

// ---- Leave-encounter -----------------------------------------------------------

// Standard "leave the encounter": restores the saved tile-enter message,
// clears state.encounter, and (if animations enabled) enqueues a grid transition
// back to the overworld. Used by camp/town/farm/locksmith ACTION_*_LEAVE handlers.
export function leaveEncounter(state: State, fromGrid: GridFromKind): State {
  const enc: Encounter | null = state.encounter
  const restore = enc?.restoreMessage ?? state.ui.message
  const baseUi: Ui = { ...state.ui, message: restore }
  if (!ENABLE_ANIMATIONS) {
    return { ...state, encounter: null, ui: baseUi }
  }
  const uiWith = enqueueGridTransition(baseUi, { from: fromGrid, to: 'overworld' })
  return { ...state, encounter: null, ui: uiWith }
}

// ---- Apply deltas with animations ----------------------------------------------

// One side-effect of an encounter action: a resource changed, optionally show a popup.
export type ResourceDelta = { target: DeltaAnimTarget; delta: number }

export type ApplyDeltasArgs = {
  // The new resources after the action (already foodCarry-clamped if applicable).
  resources?: Resources
  // Optional run-state update (e.g. when an action consumes a copyCursor).
  run?: Run
  // The full message to set (already prefixed by the caller).
  message: string
  // Per-resource deltas to animate. Zero-delta entries are silently skipped.
  deltas: readonly ResourceDelta[]
}

// Apply an encounter action's effect: set the new message, optionally update resources/run,
// and enqueue one delta-popup per non-zero entry in `args.deltas`.
export function applyDeltas(state: State, args: ApplyDeltasArgs): State {
  const baseUi: Ui = { ...state.ui, message: args.message }
  const baseNext: State = {
    ...state,
    ...(args.resources ? { resources: args.resources } : {}),
    ...(args.run ? { run: args.run } : {}),
    ui: baseUi,
  }
  if (!ENABLE_ANIMATIONS) return baseNext

  let uiWith = baseUi
  for (let i = 0; i < args.deltas.length; i++) {
    const d = args.deltas[i]!
    uiWith = enqueueDeltas(uiWith, { target: d.target, deltas: [d.delta] })
  }
  return { ...baseNext, ui: uiWith }
}

// ---- Buy primitive --------------------------------------------------------------

// What the player gains: numeric fields are added; boolean flags are set true.
// Food gain is NOT clamped here — caller clamps via `resourcesWithClampedFoodIfNeeded`
// and rebuilds the food delta from the applied diff if needed.
export type BuyGain = Partial<{
  food: number
  armySize: number
  hasBronzeKey: boolean
  hasScout: boolean
  hasTameBeast: boolean
}>

export type BuyResult =
  | { outcome: 'ok'; resources: Resources; deltas: ResourceDelta[] }
  | { outcome: 'noFunds' }

// Pure transactional primitive: check funds, deduct, apply gain, emit non-zero deltas.
// Does NOT touch lore, messages, RNG, or food-carry clamping — caller's job.
export function buy(
  resources: Resources,
  spec: { gold?: number; food?: number; gain: BuyGain },
): BuyResult {
  const goldCost = spec.gold ?? 0
  const foodCost = spec.food ?? 0
  if (resources.gold < goldCost || resources.food < foodCost) return { outcome: 'noFunds' }

  const gain = spec.gain
  const foodGain = gain.food ?? 0
  const armyGain = gain.armySize ?? 0
  const next: Resources = {
    ...resources,
    gold: resources.gold - goldCost,
    food: resources.food - foodCost + foodGain,
    armySize: resources.armySize + armyGain,
    ...(gain.hasBronzeKey ? { hasBronzeKey: true } : {}),
    ...(gain.hasScout ? { hasScout: true } : {}),
    ...(gain.hasTameBeast ? { hasTameBeast: true } : {}),
  }

  const deltas: ResourceDelta[] = []
  if (goldCost) deltas.push({ target: 'gold', delta: -goldCost })
  const netFood = foodGain - foodCost
  if (netFood) deltas.push({ target: 'food', delta: netFood })
  if (armyGain) deltas.push({ target: 'army', delta: armyGain })

  return { outcome: 'ok', resources: next, deltas }
}

// ---- Apply enter-anims --------------------------------------------------------

// Translates a mechanic's `TileEnterResult.enterAnims` into actual UI anim enqueues.
// `startFrame` is the frame at which the post-move-slide reveal begins; each spec's
// `afterFrames` (default 0) offsets further relative to that, so a def returning
// `{kind: 'gridTransition', from: 'overworld', to: 'camp'}` fires its grid transition
// exactly when the move-slide reveal completes.
export function applyEnterAnims(ui: Ui, anims: readonly AnimSpec[], startFrame: number): Ui {
  let next = ui
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    const offset = a.afterFrames ?? 0
    next = enqueueGridTransition(next, { from: a.from, to: a.to, startFrame: startFrame + offset })
  }
  return next
}
