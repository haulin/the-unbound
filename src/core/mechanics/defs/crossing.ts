import {
  COMPANION_HIRE_GOLD_MAX,
  COMPANION_HIRE_GOLD_MIN,
  CROSSING_COUNT_MAX,
  CROSSING_COUNT_MIN,
  CROSSING_EMPTY_LINES,
  CROSSING_ENTER_LINES,
  CROSSING_NAME_POOL,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import {
  BOAR_SELL_LINES,
  HEALER_SELL_LINES,
  MULE_SELL_LINES,
  SCOUT_SELL_LINES,
} from '../../lore'
import type { Change } from '../../reducer'
import { RNG } from '../../rng'
import { inventorySpriteId, SPRITES } from '../../spriteIds'
import type { CrossingCell, CrossingEncounter, State } from '../../types'
import {
  encounterStableLine,
  leaveEncounter,
  loreMessage,
  makeRightGrid,
  openNamedPoiEncounter,
  poiTitleFor,
  setEncounterMessage,
  type RightGridActionCell,
} from '../encounterHelpers'
import { cellId, isTerrainCell, placeNamedFeatureFromSeed } from '../../worldgen'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider, ReduceEncounterAction } from '../types'

export const ACTION_CROSSING_SELL = 'CROSSING_SELL' as const
export const ACTION_CROSSING_LEAVE = 'CROSSING_LEAVE' as const

export type CrossingAction =
  | { type: typeof ACTION_CROSSING_SELL; slotId: string }
  | { type: typeof ACTION_CROSSING_LEAVE }

const SELL_LINES_BY_SLOT: Record<string, readonly string[]> = {
  mule: MULE_SELL_LINES,
  boar: BOAR_SELL_LINES,
  scout: SCOUT_SELL_LINES,
  healer: HEALER_SELL_LINES,
}

export function crossingSellGold(args: {
  seed: number
  stepCount: number
  cellId: number
  slotId: string
}): number {
  const min = Math.floor(COMPANION_HIRE_GOLD_MIN / 2)
  const max = Math.floor(COMPANION_HIRE_GOLD_MAX / 2)
  return RNG.keyedIntInRange(
    { seed: args.seed, stepCount: args.stepCount, cellId: args.cellId, salt: `crossing.sell.${args.slotId}` },
    min,
    max,
  )
}

function buildSellGoldBySlot(args: {
  seed: number
  stepCount: number
  cellId: number
  party: readonly string[]
}): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < args.party.length; i++) {
    const slotId = args.party[i]!
    out[slotId] = crossingSellGold({ ...args, slotId })
  }
  return out
}

const onEnterCrossing: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'crossing') return {}
  const crossingCell = getCellAt(world, pos)
  if (!crossingCell || crossingCell.kind !== 'crossing') return {}

  const title = poiTitleFor(crossingCell.name, 'Crossing')
  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(CROSSING_ENTER_LINES, { placeId: crossingCell.id })

  if (resources.party.length === 0) {
    const emptyLine = r.stableLine(CROSSING_EMPTY_LINES, { placeId: crossingCell.id })
    return { message: loreMessage(title, emptyLine), knowsPosition: true }
  }

  const sourceCellId = cellIdForPos(world, pos)
  return {
    ...openNamedPoiEncounter({
      kind: 'crossing',
      sourceCellId,
      title,
      enterBody: line,
      extra: {
        sellGoldBySlot: buildSellGoldBySlot({
          seed: world.seed,
          stepCount,
          cellId: sourceCellId,
          party: resources.party,
        }),
      },
    }),
    knowsPosition: true,
  }
}

const reduceCrossingAction: ReduceEncounterAction = (state, action) => {
  switch (action.type) {
    case ACTION_CROSSING_LEAVE:
      return leaveEncounter(state, 'crossing')
    case ACTION_CROSSING_SELL:
      return reduceCrossingSell(state, action.slotId)
    default:
      return null
  }
}

function reduceCrossingSell(state: State, slotId: string): Change {
  const enc = state.encounter
  if (!enc || enc.kind !== 'crossing') return {}

  const crossing = getCellAt(state.world, state.player.position) as CrossingCell
  const title = poiTitleFor(crossing.name, 'Crossing')
  if (!state.resources.party.includes(slotId)) return setEncounterMessage(title, encounterStableLine(state, 'crossing.sell.missing', CROSSING_EMPTY_LINES))

  const gold = enc.sellGoldBySlot[slotId]
  if (gold == null) return setEncounterMessage(title, encounterStableLine(state, 'crossing.sell.missing', CROSSING_EMPTY_LINES))

  const lines = SELL_LINES_BY_SLOT[slotId]
  if (!lines) return {}
  const line = encounterStableLine(state, `crossing.sell.${slotId}`, lines)
  const nextParty = state.resources.party.filter((slot) => slot !== slotId)
  const nextResources = {
    ...state.resources,
    party: nextParty,
    gold: state.resources.gold + gold,
  }

  if (nextParty.length === 0) {
    return {
      resources: nextResources,
      encounter: null,
      message: loreMessage(title, line),
      events: [{ kind: 'encounterClosed', encounterKind: 'crossing', outcome: 'purchase' }],
    }
  }

  return {
    resources: nextResources,
    message: loreMessage(title, line),
  }
}

const placeCrossings: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  const countRng = RNG.createStreamRandomFromSeed(seed, 'place.crossing.count')
  const crossingCount = countRng.intInRange(CROSSING_COUNT_MIN, CROSSING_COUNT_MAX)

  placeNamedFeatureFromSeed(cells, seed, 'place.crossing', {
    count: crossingCount,
    namePool: CROSSING_NAME_POOL,
    fallbackName: 'A',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name }) => ({ kind: 'crossing', id: cellId(x, y), name }),
  })
  return { rngState }
}

function crossingSellCell(state: State, partyIndex: number): RightGridActionCell | null {
  const enc = state.encounter
  if (!enc || enc.kind !== 'crossing') return null
  const slotId = state.resources.party[partyIndex]
  if (!slotId) return null
  const spriteId = inventorySpriteId(slotId)
  if (spriteId == null) return null
  const gold = enc.sellGoldBySlot[slotId]
  const action = { type: ACTION_CROSSING_SELL, slotId }
  if (gold == null) return { spriteId, action }
  return {
    spriteId,
    action,
    badge: { variant: 'price', text: `+${gold}` },
  }
}

const crossingRightGrid = makeRightGrid({
  leaveAction: { type: ACTION_CROSSING_LEAVE },
  left: (s) => crossingSellCell(s, 0),
  top: (s) => crossingSellCell(s, 1),
  bottom: (s) => crossingSellCell(s, 2),
})

export const crossingMechanic: MechanicDef = {
  id: 'crossing',
  kinds: ['crossing'],
  mapLabel: 'X',
  onEnterTile: onEnterCrossing,
  poiSignpost: {
    rank: 35,
    name: (cell) => `${(cell as CrossingCell).name || 'A'} Crossing`,
  },
  placeWorld: placeCrossings,
  encounter: {
    kind: 'crossing',
    reduceAction: reduceCrossingAction,
    previewEncounter: (s): CrossingEncounter => {
      const cellId = cellIdForPos(s.world, s.player.position)
      return {
        kind: 'crossing',
        sourceCellId: cellId,
        restoreMessage: '',
        sellGoldBySlot: buildSellGoldBySlot({
          seed: s.world.seed,
          stepCount: s.run.stepCount,
          cellId,
          party: s.resources.party,
        }),
      }
    },
    rightGrid: crossingRightGrid,
    illustrationSpriteId: SPRITES.flavor.crossingRider,
  },
}
