// Shared helpers used by encounter mechanic defs.
// Must NOT import MECHANIC_INDEX or any def-level module (cycle: the index is
// built from defs that import this file).

import {
  BOAR_MULE_REFUSED_LINES,
  COMPANION_ALREADY_LINES,
  LOST_FLAVOR_LINES,
  MAX_PARTY_SLOTS,
  MULE_BOAR_REFUSED_LINES,
  PARTY_FULL_LINES,
  NO_GOLD_LINES,
  terrainLoreLinesForKind,
} from '../constants'
import { cellIdForPos } from '../cells'
import { RNG } from '../rng'
import { pickTeleportDestination } from '../teleport'
import type { Change } from '../reducer'
import type { MoveEvent, MoveEventPolicy, MoveEventSource, TileEnterCtx, TileEnterResult } from './types'
import { SPRITES } from '../spriteIds'
import { FOOD_CARRY_FULL_MESSAGE } from '../foodCarry'
import type {
  Action,
  DomainEvent,
  Encounter,
  EncounterKind,
  HighlightTarget,
  Resources,
  State,
  Vec2,
  World,
} from '../types'
import type { RightGridProvider } from './types'

export type CellBadge = { variant: 'price' | 'left'; text: string }

// ---- Lore messages -------------------------------------------------------------
//
// Format: optional title (named PoIs only) + body line. Unnamed tiles (terrain,
// lakes, rainbows, ambush open) pass title undefined. restoreMessage for titled
// encounters is always loreMessage(title, enterBody) so combat outcomes can
// recover the title via loreTitleFromRestore.

export type PoiTitleSuffix = 'Town' | 'Farm' | 'Camp' | 'Henge' | 'Crossing'

const POI_TITLE_FALLBACK: Record<PoiTitleSuffix, string> = {
  Town: 'A Town',
  Farm: 'A Farm',
  Camp: 'A Camp',
  Henge: 'A Henge',
  Crossing: 'A Crossing',
}

/** Display title from worldgen name + kind suffix (e.g. "Stonebridge Town"). */
export function poiTitleFor(name: string | undefined, suffix: PoiTitleSuffix): string {
  const trimmed = name?.trim()
  if (trimmed) return `${trimmed} ${suffix}`
  return POI_TITLE_FALLBACK[suffix]
}

export function loreMessage(title: string | undefined, body: string): string {
  const t = title?.trim()
  if (!t) return body
  return `${t}\n${body}`
}

/** Title line when restoreMessage was stored as title\\nbody; else undefined. */
export function loreTitleFromRestore(restoreMessage: string): string | undefined {
  const i = restoreMessage.indexOf('\n')
  if (i < 0) return undefined
  const title = restoreMessage.slice(0, i).trim()
  return title || undefined
}

/** Sets the displayed message to "[title\n]body". Returns a Change so the
 *  caller can `return` it (or merge into a larger Change). */
export function setLoreMessage(title: string | undefined, body: string): Change {
  return { message: loreMessage(title, body) }
}

/** Update body during an encounter; keep title from encounter.restoreMessage when present. */
export function setEncounterLoreBody(state: State, body: string): Change {
  const enc = state.encounter
  const title = enc?.restoreMessage ? loreTitleFromRestore(enc.restoreMessage) : undefined
  return setLoreMessage(title, body)
}

/** Combat/payment outcome lines: preserve titled restoreMessage, else body only. */
export function combatLoreMessage(state: State, body: string): string {
  const enc = state.encounter
  const title = enc?.restoreMessage ? loreTitleFromRestore(enc.restoreMessage) : undefined
  return loreMessage(title, body)
}

export function openNamedPoiEncounter<K extends EncounterKind>(args: {
  kind: K
  sourceCellId: number
  title: string
  enterBody: string
  extra?: Omit<Extract<Encounter, { kind: K }>, 'kind' | 'sourceCellId' | 'restoreMessage'>
}): TileEnterResult & { encounter: Extract<Encounter, { kind: K }> } {
  const message = loreMessage(args.title, args.enterBody)
  const encounter = {
    kind: args.kind,
    sourceCellId: args.sourceCellId,
    restoreMessage: message,
    ...args.extra,
  } as Extract<Encounter, { kind: K }>
  // `reduceMove` derives the `encounterOpened` event from `outcome.encounter`;
  // the platform translator paints the grid transition.
  return { message, encounter }
}

// ---- Message + encounter scaffolding ------------------------------------------

/** Named PoI or fixed title + new body line. Combat prefers `setEncounterLoreBody` (it reads the title from the live encounter). */
export function setEncounterMessage(title: string, line: string): Change {
  return setLoreMessage(title, line)
}

export type FeedbackReason = { kind: 'shortfall'; resource: 'gold' | 'food' }

export type FeedbackSpec = {
  action: string
  category: 'purchase'
  outcome: 'success' | 'failure'
  reason?: FeedbackReason
  message: string
}

/** Mechanic supplies `message` (pools + RNG stay in def files); highlights derive from `reason`. */
export function feedbackChange(_state: State, spec: FeedbackSpec): Change {
  const events = highlightsForReason(spec.reason)
  return {
    message: spec.message,
    ...(events.length ? { events } : {}),
  }
}

function highlightsForReason(reason: FeedbackReason | undefined): readonly DomainEvent[] {
  if (!reason) return []
  if (reason.kind === 'shortfall') {
    return [iconHighlighted({ band: 'stats', id: reason.resource })]
  }
  return []
}

/** @deprecated Prefer `feedbackChange` with mechanic-owned message + `action` key. */
export function noGoldResponse(state: State, prefix: string): Change {
  return feedbackChange(state, {
    action: 'purchase.shortfall',
    category: 'purchase',
    outcome: 'failure',
    reason: { kind: 'shortfall', resource: 'gold' },
    message: loreMessage(prefix, encounterStableLine(state, 'noGold', NO_GOLD_LINES)),
  })
}

export function encounterStableLine(state: State, tag: string, pool: readonly string[]): string {
  const enc = state.encounter
  const salt = enc ? `${enc.kind}.${enc.sourceCellId}.${tag}` : tag
  return RNG.createRunCopyRandom(state).stableLine(pool, { salt })
}

export function iconHighlighted(target: HighlightTarget): DomainEvent {
  return { kind: 'iconHighlighted', target }
}

// Mule and boar cannot share a party — refusal highlights the held blocker.
export function refuseAnimalPairing(state: State, prefix: string, slotId: string): Change | null {
  const party = state.resources.party
  if (slotId === 'boar' && party.includes('mule')) {
    return {
      ...setEncounterMessage(prefix, encounterStableLine(state, 'refuse.boarWithMule', BOAR_MULE_REFUSED_LINES)),
      events: [iconHighlighted({ band: 'party', id: 'mule' })],
    }
  }
  if (slotId === 'mule' && party.includes('boar')) {
    return {
      ...setEncounterMessage(prefix, encounterStableLine(state, 'refuse.muleWithBoar', MULE_BOAR_REFUSED_LINES)),
      events: [iconHighlighted({ band: 'party', id: 'boar' })],
    }
  }
  return null
}

/** Carry-cap refusal — army stat carries the limit. */
export function foodCarryFullResponse(title: string): Change {
  return {
    ...setEncounterMessage(title, FOOD_CARRY_FULL_MESSAGE),
    events: [iconHighlighted({ band: 'stats', id: 'army' })],
  }
}

// Returns null when the slot is hireable (caller proceeds with the buy).
// Returns a refusal Change (party-full or already-hired line) otherwise.
export function refuseCompanionHire(state: State, prefix: string, slot: string): Change | null {
  const party = state.resources.party
  if (party.length >= MAX_PARTY_SLOTS) {
    return setEncounterMessage(prefix, encounterStableLine(state, 'party.full', PARTY_FULL_LINES))
  }
  if (party.includes(slot)) {
    return {
      ...setEncounterMessage(
        prefix,
        encounterStableLine(state, `companion.already.${slot}`, COMPANION_ALREADY_LINES),
      ),
      events: [iconHighlighted({ band: 'party', id: slot })],
    }
  }
  return null
}

// ---- Leave-encounter -----------------------------------------------------------

// Standard "leave the encounter": restores the tile-enter message, clears
// state.encounter, emits an encounterClosed event for the platform translator
// to paint the close transition.
export function leaveEncounter(state: State, fromKind: EncounterKind): Change {
  const enc: Encounter | null = state.encounter
  const restore = enc?.restoreMessage ?? state.ui.message
  return {
    encounter: null,
    message: restore,
    events: [{ kind: 'encounterClosed', encounterKind: fromKind, outcome: 'leave' }],
  }
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
  | { outcome: 'ok'; resources: Resources }
  | { outcome: 'shortfall'; resource: 'gold' | 'food' }

// Pure transactional primitive: check funds, deduct, apply gain.
// Does NOT touch lore, messages, RNG, food-carry clamping, or events —
// caller's job. The resource diff between `state.resources` and the returned
// `resources` drives `commit()`'s auto-derived `resourceChanged` events.
export function buy(
  resources: Resources,
  spec: { gold?: number; food?: number; gain: BuyGain },
): BuyResult {
  const goldCost = spec.gold ?? 0
  const foodCost = spec.food ?? 0
  if (resources.gold < goldCost) return { outcome: 'shortfall', resource: 'gold' }
  if (resources.food < foodCost) return { outcome: 'shortfall', resource: 'food' }

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

  return { outcome: 'ok', resources: next }
}

export function hireCompanion(
  state: State,
  args: { prefix: string; slotId: string; goldCost: number; successLine: string },
): Change {
  const refused = refuseCompanionHire(state, args.prefix, args.slotId)
  if (refused) return refused
  const pairing = refuseAnimalPairing(state, args.prefix, args.slotId)
  if (pairing) return pairing
  const result = buy(state.resources, { gold: args.goldCost, gain: { party: [args.slotId] } })
  if (result.outcome === 'shortfall') {
    return feedbackChange(state, {
      action: `hire.${args.slotId}`,
      category: 'purchase',
      outcome: 'failure',
      reason: { kind: 'shortfall', resource: result.resource },
      message: loreMessage(args.prefix, encounterStableLine(state, 'noGold', NO_GOLD_LINES)),
    })
  }
  const events =
    args.slotId === 'mule'
      ? [iconHighlighted({ band: 'stats', id: 'food' })]
      : undefined
  return {
    resources: result.resources,
    message: loreMessage(args.prefix, args.successLine),
    ...(events ? { events } : {}),
  }
}

// ---- Party-slot append --------------------------------------------------------

// Idempotent on duplicates; silently no-ops once `party` reaches `MAX_PARTY_SLOTS`.
export function appendPartySlot(party: readonly string[], slot: string): string[] {
  if (party.includes(slot)) return [...party]
  if (party.length >= MAX_PARTY_SLOTS) return [...party]
  return [...party, slot]
}

// ---- Right-grid factory --------------------------------------------------------

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

// Builds a `RightGridProvider` for the shared encounter-grid shape: leave
// button SE, player-tile center, and 0–3 action cells at named slots
// (top/left/bottom). Any slot accepts a value or `(s) => value` for
// state-dependent content.
export type RightGridActionCell = { spriteId: number; action: Action; badge?: CellBadge }

export type GridActionRow = {
  spriteId: number | ((s: State) => number)
  badge?: CellBadge | ((s: State) => CellBadge | null)
}

export type RightGridActionSlot =
  | RightGridActionCell
  | ((s: State) => RightGridActionCell | null)

export type RightGridSpec = {
  leaveAction: Action
  leaveBadge?: CellBadge | ((s: State) => CellBadge | null)
  top?: RightGridActionSlot
  left?: RightGridActionSlot
  bottom?: RightGridActionSlot
}

function resolveActionSlot(slot: RightGridActionSlot | undefined, s: State): RightGridActionCell | null {
  if (!slot) return null
  return typeof slot === 'function' ? slot(s) : slot
}

// Grid cell from an action-table row — sprite, action, and badge stay on the
// same row as the reducer (static or `(s) => …` for variant art / live counts).
export function gridActionCell<K extends Action['type']>(
  table: Record<K, GridActionRow>,
  action: K,
): (s: State) => RightGridActionCell | null {
  return (s) => {
    const row = table[action]
    const spriteId = typeof row.spriteId === 'function' ? row.spriteId(s) : row.spriteId
    const cell: RightGridActionCell = { spriteId, action: { type: action } as Action }
    const badge = row.badge
    if (!badge) return cell
    const resolved = typeof badge === 'function' ? badge(s) : badge
    return resolved ? { ...cell, badge: resolved } : cell
  }
}

export function makeRightGrid(spec: RightGridSpec): RightGridProvider {
  return (s, row, col) => {
    if (row === 1 && col === 2) {
      const cell: RightGridActionCell = {
        spriteId: SPRITES.actions.return,
        action: spec.leaveAction,
      }
      if (spec.leaveBadge) {
        const lb = typeof spec.leaveBadge === 'function' ? spec.leaveBadge(s) : spec.leaveBadge
        if (lb) cell.badge = lb
      }
      return cell
    }
    if (row === 1 && col === 1) {
      return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null }
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
): (state: State) => Extract<Encounter, { kind: K }> {
  return (_state) => ({ kind, sourceCellId: -1, restoreMessage: '' }) as Extract<Encounter, { kind: K }>
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
