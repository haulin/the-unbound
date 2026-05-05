import {
  COMBAT_ENCOUNTER_LINES,
  FOOD_COST_MOUNTAIN,
  FOOD_COST_SWAMP,
  LOST_FLAVOR_LINES,
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
  terrainLoreLinesForKind,
} from '../../constants'
import { cellIdForPos } from '../../cells'
import { RNG } from '../../rng'
import { pickTeleportDestination } from '../../teleport'
import type { MechanicDef, MoveEventPolicy, OnEnterTile } from '../types'
import { rollMoveEvent } from '../moveEvents'
import { startCombatEncounter } from './combat'

const woodsPolicy: MoveEventPolicy = {
  ambushPercent: WOODS_AMBUSH_PERCENT,
  lostPercent: WOODS_LOST_PERCENT,
  scoutLostHalves: true,
}
const swampPolicy: MoveEventPolicy = {
  ambushPercent: 0,
  lostPercent: SWAMP_LOST_PERCENT,
  scoutLostHalves: true,
}
const mountainPolicy: MoveEventPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 }

// Terrain-hazards handler: ambush roll, combat spawn, and lost-teleport flow for woods/swamp/mountain.
const onEnterTerrainHazards: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  const kind = cell.kind
  let policy: MoveEventPolicy
  if (kind === 'woods') policy = woodsPolicy
  else if (kind === 'swamp') policy = swampPolicy
  else if (kind === 'mountain') policy = mountainPolicy
  else return {}
  const tileRand = RNG.createTileRandom({ world, stepCount, pos })
  const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind(kind))

  const event = rollMoveEvent({
    policy,
    hasScout: !!resources.hasScout,
    source: kind,
    rngKeys: { seed: world.seed, stepCount, cellId: cellIdForPos(world, pos) },
  })

  if (!event) {
    return { message: tileMessage }
  }

  if (event.kind === 'fight') {
    const encounterMessage = tileRand.perMoveLine(COMBAT_ENCOUNTER_LINES)
    return startCombatEncounter({
      world,
      pos,
      playerArmy: resources.armySize,
      sourceKind: kind,
      encounterMessage,
      restoreMessage: tileMessage,
    })
  }

  // event.kind === 'lost'
  const td = pickTeleportDestination({ world, origin: pos, rngState: world.rngState })
  const nextWorld = { ...world, rngState: td.rngState }
  const lostMessage = RNG.createTileRandom({ world: nextWorld, stepCount, pos }).perMoveLine(LOST_FLAVOR_LINES)
  // The 'blank' → 'overworld' flash that accompanies a teleport is enqueued by the reducer
  // (signaled by `teleportTo != null`), not via `enterAnims`: it has different timing
  // (replaces the move-slide entirely instead of playing after it). Similarly, we don't
  // set `knowsPosition: false` here — that field is additive (OR'd with prev), and the
  // teleport-clears-known rule belongs to the reducer.
  return {
    world: nextWorld,
    teleportTo: td.destination,
    message: lostMessage,
  }
}

export const terrainHazardsMechanic: MechanicDef = {
  id: 'terrainHazards',
  kinds: ['woods', 'swamp', 'mountain'],
  enterFoodCostByKind: {
    swamp: FOOD_COST_SWAMP,
    mountain: FOOD_COST_MOUNTAIN,
  },
  moveEventPolicyByKind: {
    woods: woodsPolicy,
    swamp: swampPolicy,
    mountain: mountainPolicy,
  },
  onEnterTile: onEnterTerrainHazards,
}
