import type { CellKind } from '../types'
import type {
  EncounterKind,
  MechanicDef,
  MoveEventPolicy,
  OnEnterTile,
  ReduceEncounterAction,
  RightGridProvider,
} from './types'

export type MechanicIndex = {
  ownerByKind: Partial<Record<CellKind, string>>
  onEnterTileByKind: Partial<Record<CellKind, OnEnterTile>>
  rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>>
  reduceEncounterActionByEncounterKind: Partial<Record<EncounterKind, ReduceEncounterAction>>
  mapLabelByKind: Partial<Record<CellKind, string>>
  enterFoodCostByKind: Partial<Record<CellKind, number>>
  moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>>
}

export function buildMechanicIndex(mechanics: readonly MechanicDef[]): MechanicIndex {
  const seenIds = new Set<string>()
  const ownerByKind: Partial<Record<CellKind, string>> = {}
  const onEnterTileByKind: Partial<Record<CellKind, OnEnterTile>> = {}
  const rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>> = {}
  const reduceEncounterActionByEncounterKind: Partial<Record<EncounterKind, ReduceEncounterAction>> = {}
  const mapLabelByKind: Partial<Record<CellKind, string>> = {}
  const enterFoodCostByKind: Partial<Record<CellKind, number>> = {}
  const moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>> = {}

  const seenEncounterKinds = new Set<EncounterKind>()

  for (let i = 0; i < mechanics.length; i++) {
    const m = mechanics[i]!

    if (seenIds.has(m.id)) {
      throw new Error(`Duplicate mechanic id: ${m.id}`)
    }
    seenIds.add(m.id)

    // encounterKind keys both rightGrid lookup and reduceEncounterAction dispatch.
    // rightGrid / reduceEncounterAction without encounterKind have no lookup key — reject.
    if (m.rightGrid && !m.encounterKind) {
      throw new Error(`Mechanic ${m.id} sets rightGrid without encounterKind`)
    }
    if (m.reduceEncounterAction && !m.encounterKind) {
      throw new Error(`Mechanic ${m.id} sets reduceEncounterAction without encounterKind`)
    }
    if (m.encounterKind) {
      if (seenEncounterKinds.has(m.encounterKind)) {
        throw new Error(`Duplicate encounterKind: ${m.encounterKind}`)
      }
      seenEncounterKinds.add(m.encounterKind)
      if (m.rightGrid) rightGridByEncounterKind[m.encounterKind] = m.rightGrid
      if (m.reduceEncounterAction) reduceEncounterActionByEncounterKind[m.encounterKind] = m.reduceEncounterAction
    }

    const costByKind = m.enterFoodCostByKind
    if (costByKind) {
      for (const kindKey of Object.keys(costByKind) as CellKind[]) {
        if (!m.kinds.includes(kindKey)) {
          throw new Error(`Mechanic ${m.id} sets enterFoodCostByKind for ${kindKey} but does not claim that kind`)
        }
        const cost = costByKind[kindKey]!
        if (cost < 0) {
          throw new Error(`enterFoodCostByKind for ${kindKey} must be >= 0`)
        }
      }
    }

    const policyByKind = m.moveEventPolicyByKind
    if (policyByKind) {
      for (const kindKey of Object.keys(policyByKind) as CellKind[]) {
        if (!m.kinds.includes(kindKey)) {
          throw new Error(`Mechanic ${m.id} sets moveEventPolicyByKind for ${kindKey} but does not claim that kind`)
        }
        const policy = policyByKind[kindKey]!
        const ambushPercent = policy.ambushPercent
        const lostPercent = policy.lostPercent
        if (
          ambushPercent < 0 ||
          lostPercent < 0 ||
          ambushPercent > 100 ||
          lostPercent > 100 ||
          ambushPercent + lostPercent > 100
        ) {
          throw new Error(
            `MoveEventPolicy for ${kindKey} must have ambushPercent and lostPercent in [0, 100] with sum <= 100`,
          )
        }
      }
    }

    for (let k = 0; k < m.kinds.length; k++) {
      const kind = m.kinds[k]!
      const prevOwner = ownerByKind[kind]
      if (prevOwner) {
        throw new Error(`Duplicate kind ownership: ${kind} claimed by ${prevOwner} and ${m.id}`)
      }
      ownerByKind[kind] = m.id
      if (m.onEnterTile) onEnterTileByKind[kind] = m.onEnterTile
      if (m.mapLabel != null) mapLabelByKind[kind] = m.mapLabel
      const cost = costByKind?.[kind]
      if (cost != null) enterFoodCostByKind[kind] = cost
      const policy = policyByKind?.[kind]
      if (policy) moveEventPolicyByKind[kind] = policy
    }
  }

  return {
    ownerByKind,
    onEnterTileByKind,
    rightGridByEncounterKind,
    reduceEncounterActionByEncounterKind,
    mapLabelByKind,
    enterFoodCostByKind,
    moveEventPolicyByKind,
  }
}
