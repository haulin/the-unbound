// Shared helpers used by encounter mechanic defs.
// Must NOT import MECHANIC_INDEX or any def-level module (cycle: the index is
// built from defs that import this file).

import {
  COMPANION_ALREADY_LINES,
  ENABLE_ANIMATIONS,
  LOST_FLAVOR_LINES,
  MAX_PARTY_SLOTS,
  PARTY_FULL_LINES,
  TOWN_NO_GOLD_LINES,
  terrainLoreLinesForKind,
} from '../constants'
import { cellIdForPos } from '../cells'
import { RNG } from '../rng'
import { pickTeleportDestination } from '../teleport'
import type { MoveEvent, MoveEventPolicy, MoveEventSource, TileEnterCtx, TileEnterResult } from './types'
import { SPRITES } from '../spriteIds'
import type {
  Action,
  DeltaAnimTarget,
  Encounter,
  EncounterKind,
  GridFromKind,
  Resources,
  Run,
  State,
  Ui,
  Vec2,
  World,
} from '../types'
import { enqueueDeltas, enqueueGridTransition } from '../uiAnim'
import type { AnimSpec, PreviewPlateLine, RightGridProvider } from './types'

// ---- Preview plate from offer specs --------------------------------------------

export type GridSlot = 'top' | 'left' | 'bottom'

const GRID_SLOT_FILL_ORDER: readonly GridSlot[] = ['left', 'top', 'bottom']

// Assign offers to modal buttons in fill order (left, then top, then bottom).
export function offersToGridLayout<T extends string>(offers: readonly T[]): Record<GridSlot, T | null> {
  const layout: Record<GridSlot, T | null> = { left: null, top: null, bottom: null }
  for (let i = 0; i < GRID_SLOT_FILL_ORDER.length && i < offers.length; i++) {
    layout[GRID_SLOT_FILL_ORDER[i]!] = offers[i]!
  }
  return layout
}

// Plate line order follows button layout, then any offers not placed on the grid.
export function offersInGridOrder<T extends string>(
  offers: readonly T[],
  layout: Partial<Record<GridSlot, T | null>>,
  slots: readonly GridSlot[] = GRID_SLOT_FILL_ORDER,
): readonly T[] {
  const ordered: T[] = []
  const seen = new Set<T>()
  for (const slot of slots) {
    const o = layout[slot]
    if (o != null && offers.includes(o) && !seen.has(o)) {
      ordered.push(o)
      seen.add(o)
    }
  }
  for (const o of offers) {
    if (!seen.has(o)) ordered.push(o)
  }
  return ordered
}

export function previewPlateForOffers(
  state: State,
  offers: readonly string[],
  table: Record<string, { previewPlate?: (state: State) => readonly PreviewPlateLine[] | null }>,
): readonly PreviewPlateLine[] | null {
  const lines: PreviewPlateLine[] = []
  for (const offer of offers) {
    const part = table[offer]?.previewPlate?.(state)
    if (part) lines.push(...part)
  }
  return lines.length > 0 ? lines : null
}

// ---- Message + encounter scaffolding ------------------------------------------

// Replace the UI message with "<prefix>\n<line>".
export function setEncounterMessage(state: State, prefix: string, line: string): State {
  return { ...state, ui: { ...state.ui, message: `${prefix}\n${line}` } }
}

// Standard "you don't have enough gold" response: picks a per-move line from the shared
// TOWN_NO_GOLD_LINES pool (used today by town/farm/locksmith — the same lore is reused
// across all three since the player-facing concept is the same). Sets the encounter
// message; no resource changes.
export function noGoldResponse(state: State, prefix: string): State {
  const line = encounterStableLine(state, 'noGold', TOWN_NO_GOLD_LINES)
  return setEncounterMessage(state, prefix, line)
}

export function encounterStableLine(state: State, tag: string, pool: readonly string[]): string {
  const enc = state.encounter
  const salt = enc ? `${enc.kind}.${enc.sourceCellId}.${tag}` : tag
  return RNG.createRunCopyRandom(state).stableLine(pool, { salt })
}

export function refuseCompanionHire(prevState: State, prefix: string, slot: string): State | null {
  const party = prevState.resources.party
  if (party.length >= MAX_PARTY_SLOTS) {
    const line = encounterStableLine(prevState, 'party.full', PARTY_FULL_LINES)
    return setEncounterMessage(prevState, prefix, line)
  }
  if (party.includes(slot)) {
    const line = encounterStableLine(prevState, `companion.already.${slot}`, COMPANION_ALREADY_LINES)
    return setEncounterMessage(prevState, prefix, line)
  }
  return null
}

// ---- Leave-encounter -----------------------------------------------------------

// Standard "leave the encounter": restores the tile-enter message, clears
// state.encounter, and (if animations enabled) enqueues a grid transition
// back to the overworld.
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
  // Per-resource pops. When omitted and `resources` is set, diffs `state.resources` → `resources`.
  deltas?: readonly ResourceDelta[]
}

export function resourceDeltasFromDiff(prev: Resources, next: Resources): ResourceDelta[] {
  const out: ResourceDelta[] = []
  const food = next.food - prev.food
  if (food) out.push({ target: 'food', delta: food })
  const gold = next.gold - prev.gold
  if (gold) out.push({ target: 'gold', delta: gold })
  const army = next.armySize - prev.armySize
  if (army) out.push({ target: 'army', delta: army })
  return out
}

export function pushResourceDeltas(out: ResourceDelta[], target: DeltaAnimTarget, values: readonly number[]): void {
  for (let i = 0; i < values.length; i++) {
    const delta = values[i]!
    if (delta) out.push({ target, delta })
  }
}

// Apply an encounter action's effect: set the new message, optionally update resources/run,
// and enqueue one delta-popup per non-zero entry in `args.deltas`.
export function applyDeltas(state: State, args: ApplyDeltasArgs): State {
  const resources = args.resources ?? state.resources
  const run = args.run ?? state.run
  const deltas =
    args.deltas ?? (args.resources != null ? resourceDeltasFromDiff(state.resources, resources) : [])

  const baseUi: Ui = { ...state.ui, message: args.message }
  const baseNext: State = {
    ...state,
    resources,
    run,
    ui: baseUi,
  }
  if (!ENABLE_ANIMATIONS) return baseNext

  let uiWith = baseUi
  for (let i = 0; i < deltas.length; i++) {
    const d = deltas[i]!
    uiWith = enqueueDeltas(uiWith, { target: d.target, deltas: [d.delta] })
  }
  return { ...baseNext, ui: uiWith }
}

// `applyDeltas` + close + grid transition back to overworld. Use for one-shot
// purchases that complete the encounter (e.g. locksmith key); unlike
// `leaveEncounter`, the success message you pass is preserved.
export function applyDeltasAndClose(
  state: State,
  args: ApplyDeltasArgs,
  fromGrid: GridFromKind,
): State {
  const next = applyDeltas(state, args)
  if (!ENABLE_ANIMATIONS) return { ...next, encounter: null }
  const uiWith = enqueueGridTransition(next.ui, { from: fromGrid, to: 'overworld' })
  return { ...next, encounter: null, ui: uiWith }
}

// ---- Buy primitive --------------------------------------------------------------

// What the player gains. Numeric fields add; slot tokens append (idempotent;
// party respects `MAX_PARTY_SLOTS` via `appendPartySlot`). Food gain is NOT
// clamped here — caller clamps via `applyFoodCapOnGain(prev, next)`.
export type BuyGain = Partial<{
  food: number
  armySize: number
  inventory: readonly string[]
  party: readonly string[]
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
  let inventory = resources.inventory
  if (gain.inventory) {
    for (const slot of gain.inventory) {
      if (!inventory.includes(slot)) inventory = [...inventory, slot]
    }
  }
  let party = resources.party
  if (gain.party) {
    for (const slot of gain.party) party = appendPartySlot(party, slot)
  }
  const next: Resources = {
    ...resources,
    gold: resources.gold - goldCost,
    food: resources.food - foodCost + foodGain,
    armySize: resources.armySize + armyGain,
    inventory,
    party,
  }

  const deltas: ResourceDelta[] = []
  if (goldCost) deltas.push({ target: 'gold', delta: -goldCost })
  const netFood = foodGain - foodCost
  if (netFood) deltas.push({ target: 'food', delta: netFood })
  if (armyGain) deltas.push({ target: 'army', delta: armyGain })

  return { outcome: 'ok', resources: next, deltas }
}

export function hireCompanion(
  prevState: State,
  args: { prefix: string; slotId: string; goldCost: number; successLine: string },
): State {
  const refused = refuseCompanionHire(prevState, args.prefix, args.slotId)
  if (refused) return refused
  const result = buy(prevState.resources, { gold: args.goldCost, gain: { party: [args.slotId] } })
  if (result.outcome === 'noFunds') return noGoldResponse(prevState, args.prefix)
  return applyDeltas(prevState, {
    resources: result.resources,
    message: `${args.prefix}\n${args.successLine}`,
    deltas: result.deltas,
  })
}

// ---- Party-slot append --------------------------------------------------------

// Idempotent on duplicates; silently no-ops once `party` reaches `MAX_PARTY_SLOTS`.
export function appendPartySlot(party: readonly string[], slot: string): string[] {
  if (party.includes(slot)) return [...party]
  if (party.length >= MAX_PARTY_SLOTS) return [...party]
  return [...party, slot]
}

// ---- Right-grid factory --------------------------------------------------------

// Builds a `RightGridProvider` for the shared encounter-grid shape: leave
// button SE, decorative center, and 0–3 action cells at named slots
// (top/left/bottom). Any slot accepts a value or `(s) => value` for
// state-dependent content.
export type RightGridActionCell = { spriteId: number; action: Action }

export type RightGridActionSlot =
  | RightGridActionCell
  | ((s: State) => RightGridActionCell | null)

export type RightGridCenterSprite = number | ((s: State) => number)

export type RightGridSpec = {
  leaveAction: Action
  centerSpriteId: RightGridCenterSprite
  top?: RightGridActionSlot
  left?: RightGridActionSlot
  bottom?: RightGridActionSlot
}

function resolveActionSlot(slot: RightGridActionSlot | undefined, s: State): RightGridActionCell | null {
  if (!slot) return null
  return typeof slot === 'function' ? slot(s) : slot
}

// Build a grid button from an entry in a mechanic's action table. Keeps the
// grid declaration in lockstep with the table — the spriteId comes from the
// same row that owns the reducer.
export function gridButton<K extends Action['type']>(
  table: Record<K, { spriteId: number }>,
  action: K,
): RightGridActionCell {
  return { spriteId: table[action].spriteId, action: { type: action } as Action }
}

export function makeRightGrid(spec: RightGridSpec): RightGridProvider {
  return (s, row, col) => {
    if (row === 1 && col === 2) return { spriteId: SPRITES.actions.return, action: spec.leaveAction }
    if (row === 1 && col === 1) {
      const sid = typeof spec.centerSpriteId === 'function' ? spec.centerSpriteId(s) : spec.centerSpriteId
      return { spriteId: sid, action: null }
    }
    if (row === 0 && col === 1) return resolveActionSlot(spec.top, s) ?? { action: null }
    if (row === 1 && col === 0) return resolveActionSlot(spec.left, s) ?? { action: null }
    if (row === 2 && col === 1) return resolveActionSlot(spec.bottom, s) ?? { action: null }
    return { action: null }
  }
}

// ---- previewEncounter factory --------------------------------------------------

// Returns a previewEncounter provider for kinds whose only runtime data is the
// kind itself. The grid renderer uses these placeholders to pre-paint cross
// layouts during transitions. Kinds with extra fields (combat) build inline.
type SimpleEncounterKind = Exclude<EncounterKind, 'combat'>

export function previewEncounterProvider<K extends SimpleEncounterKind>(
  kind: K,
): () => Extract<Encounter, { kind: K }> {
  return () => ({ kind, sourceCellId: -1, restoreMessage: '' }) as Extract<Encounter, { kind: K }>
}

// ---- Apply enter-anims --------------------------------------------------------

// Translates a mechanic's `TileEnterResult.enterAnims` into UI enqueues.
// `startFrame` anchors the post-move-slide reveal; each spec's `afterFrames`
// (default 0) offsets relative to that.
export function applyEnterAnims(ui: Ui, anims: readonly AnimSpec[], startFrame: number): Ui {
  let next = ui
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    const offset = a.afterFrames ?? 0
    next = enqueueGridTransition(next, { from: a.from, to: a.to, startFrame: startFrame + offset })
  }
  return next
}

// ---- Default tile enter + move-event roll --------------------------------------

export function onEnterDefaultTerrain(
  ctx: TileEnterCtx,
): TileEnterResult & { message: string } {
  const { cell, world, pos, stepCount } = ctx
  const r = RNG.createTileRandom({ world, stepCount, pos })
  return { message: r.perMoveLine(terrainLoreLinesForKind(cell.kind)) }
}

export function rollMoveEvent(args: {
  policy: MoveEventPolicy
  hasScout: boolean
  source: MoveEventSource
  rngKeys: { seed: number; stepCount: number; cellId: number }
}): MoveEvent | null {
  const { policy, hasScout, source, rngKeys } = args

  const ambushPercent = policy.ambushPercent
  let lostPercent = policy.lostPercent
  if (hasScout && policy.scoutLostHalves) {
    lostPercent = Math.floor(lostPercent / 2)
  }

  if (ambushPercent + lostPercent === 0) return null

  const percentile = RNG.keyedIntExclusive(rngKeys, 100)

  if (percentile < ambushPercent) {
    return { kind: 'fight', source }
  }
  if (percentile < ambushPercent + lostPercent) {
    return { kind: 'lost', source }
  }
  return null
}

// ---- Terrain move events -------------------------------------------------------

export type TerrainQuietCtx = {
  tileMessage: string
  rngKeys: { seed: number; stepCount: number; cellId: number }
  tileRand: ReturnType<typeof RNG.createTileRandom>
  resources: Resources
}

export type TerrainQuietResult = { message: string; resources?: Resources }

export type QuietFindSpec = {
  findPercent: number
  lines: readonly string[]
  foodBase: number
  goldBase: number
  amountNoise: number
  rollSalt: string
  foodSalt: string
  goldSalt: string
}

export function tryQuietFind(
  spec: QuietFindSpec,
  ctx: TerrainQuietCtx,
): TerrainQuietResult | undefined {
  const { rngKeys, tileRand, resources } = ctx
  const findRoll = RNG.keyedIntExclusive({ ...rngKeys, salt: spec.rollSalt }, 100)
  if (findRoll >= spec.findPercent) return undefined

  const foodGain = Math.max(
    0,
    spec.foodBase + RNG.keyedIntInRange({ ...rngKeys, salt: spec.foodSalt }, -spec.amountNoise, spec.amountNoise),
  )
  const goldGain = Math.max(
    0,
    spec.goldBase + RNG.keyedIntInRange({ ...rngKeys, salt: spec.goldSalt }, -spec.amountNoise, spec.amountNoise),
  )
  return {
    message: tileRand.perMoveLine(spec.lines),
    resources: {
      ...resources,
      food: resources.food + foodGain,
      gold: resources.gold + goldGain,
    },
  }
}

export type ResolvedTerrainMove =
  | { outcome: 'quiet'; message: string; resources?: Resources }
  | { outcome: 'fight' }
  | { outcome: 'lost'; world: World; teleportTo: Vec2; message: string }

export function resolveTerrainMove(args: {
  moveEventSource: MoveEventSource
  policy: MoveEventPolicy
  world: World
  pos: Vec2
  stepCount: number
  resources: Resources
  hasScout: boolean
  tileMessage: string
  onQuiet?: (ctx: TerrainQuietCtx) => TerrainQuietResult | undefined
}): { tileMessage: string; resolved: ResolvedTerrainMove } {
  const { moveEventSource, policy, world, pos, stepCount, resources, hasScout, tileMessage, onQuiet } =
    args
  const rngKeys = { seed: world.seed, stepCount, cellId: cellIdForPos(world, pos) }
  const tileRand = RNG.createTileRandom({ world, stepCount, pos })

  const event = rollMoveEvent({
    policy,
    hasScout,
    source: moveEventSource,
    rngKeys,
  })

  if (!event) {
    const quietCtx: TerrainQuietCtx = { tileMessage, rngKeys, tileRand, resources }
    const custom = onQuiet?.(quietCtx)
    if (custom) {
      const resolved: ResolvedTerrainMove = {
        outcome: 'quiet',
        message: custom.message,
        ...(custom.resources !== undefined ? { resources: custom.resources } : {}),
      }
      return { tileMessage, resolved }
    }
    return { tileMessage, resolved: { outcome: 'quiet', message: tileMessage } }
  }

  if (event.kind === 'fight') {
    return { tileMessage, resolved: { outcome: 'fight' } }
  }

  const td = pickTeleportDestination({ world, origin: pos, rngState: world.rngState })
  const nextWorld = { ...world, rngState: td.rngState }
  const lostMessage = RNG.createTileRandom({ world: nextWorld, stepCount, pos }).perMoveLine(
    LOST_FLAVOR_LINES,
  )
  return {
    tileMessage,
    resolved: {
      outcome: 'lost',
      world: nextWorld,
      teleportTo: td.destination,
      message: lostMessage,
    },
  }
}

export function tileEnterFromTerrainMove(
  resolved: ResolvedTerrainMove,
  onFight: () => TileEnterResult,
): TileEnterResult {
  switch (resolved.outcome) {
    case 'quiet':
      return {
        message: resolved.message,
        ...(resolved.resources ? { resources: resolved.resources } : {}),
      }
    case 'fight':
      return onFight()
    case 'lost':
      return {
        world: resolved.world,
        teleportTo: resolved.teleportTo,
        message: resolved.message,
      }
  }
}
