import type { CellKind } from '../types'
import type {
  EncounterKind,
  MechanicDef,
  MoveEventPolicy,
  RightGridProvider,
  StartEncounterFn,
  TileEnterHandler,
} from './types'

export type MechanicIndex = {
  ownerByKind: Partial<Record<CellKind, string>>
  onEnterByKind: Partial<Record<CellKind, TileEnterHandler>>
  startEncounterByKind: Partial<Record<CellKind, StartEncounterFn>>
  rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>>
  mapLabelByKind: Partial<Record<CellKind, string>>
  enterFoodCostByKind: Partial<Record<CellKind, number>>
  moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>>
}

export function buildMechanicIndex(mechanics: readonly MechanicDef[]): MechanicIndex {
  const seenIds = new Set<string>()
  const ownerByKind: Partial<Record<CellKind, string>> = {}
  const onEnterByKind: Partial<Record<CellKind, TileEnterHandler>> = {}
  const startEncounterByKind: Partial<Record<CellKind, StartEncounterFn>> = {}
  const rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>> = {}
  const mapLabelByKind: Partial<Record<CellKind, string>> = {}
  const enterFoodCostByKind: Partial<Record<CellKind, number>> = {}
  const moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>> = {}

  for (let i = 0; i < mechanics.length; i++) {
    const m = mechanics[i]!

    if (seenIds.has(m.id)) {
      throw new Error(`Duplicate mechanic id: ${m.id}`)
    }
    seenIds.add(m.id)

    const encounterKind = m.rightGridEncounterKind
    const provider = m.rightGrid
    if ((encounterKind && !provider) || (!encounterKind && provider)) {
      throw new Error(`Mechanic ${m.id} must set both rightGridEncounterKind and rightGrid`)
    }
    if (encounterKind && provider) {
      const prev = rightGridByEncounterKind[encounterKind]
      if (prev) throw new Error(`Duplicate rightGridEncounterKind: ${encounterKind}`)
      rightGridByEncounterKind[encounterKind] = provider
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
      if (m.onEnter) onEnterByKind[kind] = m.onEnter
      if (m.startEncounter) startEncounterByKind[kind] = m.startEncounter
      if (m.mapLabel != null) mapLabelByKind[kind] = m.mapLabel
      const cost = costByKind?.[kind]
      if (cost != null) enterFoodCostByKind[kind] = cost
      const policy = policyByKind?.[kind]
      if (policy) moveEventPolicyByKind[kind] = policy
    }
  }

  return {
    ownerByKind,
    onEnterByKind,
    startEncounterByKind,
    rightGridByEncounterKind,
    mapLabelByKind,
    enterFoodCostByKind,
    moveEventPolicyByKind,
  }
}
