import type { CellKind, EncounterKind, World } from '../types'
import type { CombatVariantConfig } from './defs/combat'
import type {
  MechanicDef,
  MoveEventPolicy,
  OnEnterTile,
  PoiSignpostContribution,
  PreviewEncounterProvider,
  PreviewPlateDeltaAnchor,
  PreviewPlateProvider,
  ReduceEncounterAction,
  RightGridProvider,
} from './types'

export type OnCombatResolvedHook = (world: World, sourceCellId: number) => World

export type MechanicIndex = {
  ownerByKind: Partial<Record<CellKind, string>>
  onEnterTileByKind: Partial<Record<CellKind, OnEnterTile>>
  rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>>
  reduceEncounterActionByEncounterKind: Partial<Record<EncounterKind, ReduceEncounterAction>>
  previewPlateByEncounterKind: Partial<Record<EncounterKind, PreviewPlateProvider>>
  previewPlateDeltaAnchorsByEncounterKind: Partial<Record<EncounterKind, readonly PreviewPlateDeltaAnchor[]>>
  previewEncounterByEncounterKind: Partial<Record<EncounterKind, PreviewEncounterProvider>>
  poiSignpostByKind: Partial<Record<CellKind, PoiSignpostContribution>>
  mapLabelByKind: Partial<Record<CellKind, string>>
  enterFoodCostByKind: Partial<Record<CellKind, number>>
  moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>>
  combatVariantByKind: Partial<Record<CellKind, CombatVariantConfig>>
  onCombatResolvedByKind: Partial<Record<CellKind, OnCombatResolvedHook>>
}

export function buildMechanicIndex(mechanics: readonly MechanicDef[]): MechanicIndex {
  const seenIds = new Set<string>()
  const ownerByKind: Partial<Record<CellKind, string>> = {}
  const onEnterTileByKind: Partial<Record<CellKind, OnEnterTile>> = {}
  const rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>> = {}
  const reduceEncounterActionByEncounterKind: Partial<Record<EncounterKind, ReduceEncounterAction>> = {}
  const previewPlateByEncounterKind: Partial<Record<EncounterKind, PreviewPlateProvider>> = {}
  const previewPlateDeltaAnchorsByEncounterKind: Partial<Record<EncounterKind, readonly PreviewPlateDeltaAnchor[]>> = {}
  const previewEncounterByEncounterKind: Partial<Record<EncounterKind, PreviewEncounterProvider>> = {}
  const poiSignpostByKind: Partial<Record<CellKind, PoiSignpostContribution>> = {}
  const mapLabelByKind: Partial<Record<CellKind, string>> = {}
  const enterFoodCostByKind: Partial<Record<CellKind, number>> = {}
  const moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>> = {}
  const combatVariantByKind: Partial<Record<CellKind, CombatVariantConfig>> = {}
  const onCombatResolvedByKind: Partial<Record<CellKind, OnCombatResolvedHook>> = {}

  const seenEncounterKinds = new Set<EncounterKind>()

  for (let i = 0; i < mechanics.length; i++) {
    const m = mechanics[i]!

    if (seenIds.has(m.id)) {
      throw new Error(`Duplicate mechanic id: ${m.id}`)
    }
    seenIds.add(m.id)

    if (m.encounter) {
      const ek = m.encounter.kind
      if (seenEncounterKinds.has(ek)) {
        throw new Error(`Duplicate encounterKind: ${ek}`)
      }
      seenEncounterKinds.add(ek)
      if (m.encounter.rightGrid) rightGridByEncounterKind[ek] = m.encounter.rightGrid
      if (m.encounter.reduceAction) reduceEncounterActionByEncounterKind[ek] = m.encounter.reduceAction
      if (m.encounter.previewPlate) previewPlateByEncounterKind[ek] = m.encounter.previewPlate
      if (m.encounter.previewPlateDeltaAnchors) {
        previewPlateDeltaAnchorsByEncounterKind[ek] = m.encounter.previewPlateDeltaAnchors
      }
      if (m.encounter.previewEncounter) previewEncounterByEncounterKind[ek] = m.encounter.previewEncounter
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
      if (m.poiSignpost) poiSignpostByKind[kind] = m.poiSignpost
      if (m.combatVariant) combatVariantByKind[kind] = m.combatVariant
      if (m.onCombatResolved) onCombatResolvedByKind[kind] = m.onCombatResolved
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
    previewPlateByEncounterKind,
    previewPlateDeltaAnchorsByEncounterKind,
    previewEncounterByEncounterKind,
    poiSignpostByKind,
    mapLabelByKind,
    enterFoodCostByKind,
    moveEventPolicyByKind,
    combatVariantByKind,
    onCombatResolvedByKind,
  }
}
