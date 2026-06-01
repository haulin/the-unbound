import { describe, expect, it } from 'vitest'
import { buildMechanicIndex } from '../../src/core/mechanics/registry'
import type { CombatVariantConfig } from '../../src/core/mechanics/defs/combat'
import type {
  MechanicDef,
  OnEnterTile,
  ReduceEncounterAction,
  RightGridProvider,
} from '../../src/core/mechanics/types'
import type { CellKind } from '../../src/core/types'

function mech(id: string, kinds: readonly CellKind[], onEnterTile?: OnEnterTile): MechanicDef {
  return {
    id,
    kinds,
    ...(onEnterTile ? { onEnterTile } : {}),
  }
}

describe('mechanics registry', () => {
  const onEnterGate: OnEnterTile = () => ({ message: '' })

  it('throws if two mechanics share the same id', () => {
    const mechanics = [mech('dup', ['gate'], onEnterGate), mech('dup', ['locksmith'], onEnterGate)]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate mechanic id/i)
  })

  it('throws if two mechanics claim the same kind (even if one has no onEnterTile)', () => {
    const mechanics = [mech('a', ['gate']), mech('b', ['gate'], onEnterGate)]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate kind ownership/i)
  })

  it('indexes onEnterTile handlers by kind (including multi-kind ownership)', () => {
    const mechanics = [mech('gate', ['gate', 'gateOpen'], onEnterGate)]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.onEnterTileByKind.gate).toBe(onEnterGate)
    expect(idx.onEnterTileByKind.gateOpen).toBe(onEnterGate)
  })

  it('indexes map labels by kind (including multi-kind ownership)', () => {
    const mechanics: MechanicDef[] = [{ id: 'gate', kinds: ['gate', 'gateOpen'], mapLabel: 'G' }]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.mapLabelByKind.gate).toBe('G')
    expect(idx.mapLabelByKind.gateOpen).toBe('G')
  })

  it('indexes move event policies by kind', () => {
    const mechanics: MechanicDef[] = [
      {
        id: 'hazards',
        kinds: ['woods', 'swamp'],
        moveEventPolicyByKind: {
          woods: { ambushPercent: 15, lostPercent: 10, scoutLostHalves: true },
          swamp: { ambushPercent: 0, lostPercent: 20, scoutLostHalves: true },
        },
      },
    ]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.moveEventPolicyByKind.woods?.lostPercent).toBe(10)
    expect(idx.moveEventPolicyByKind.swamp?.lostPercent).toBe(20)
  })

  it('throws if a move-event policy allocates more than 100%', () => {
    const mechanics: MechanicDef[] = [
      {
        id: 'bad',
        kinds: ['woods'],
        moveEventPolicyByKind: {
          woods: { ambushPercent: 60, lostPercent: 60 },
        },
      },
    ]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/moveeventpolicy.*100/i)
  })

  it('indexes rightGrid providers by encounter kind', () => {
    const p: RightGridProvider = () => ({ action: null })
    const mechanics: MechanicDef[] = [
      { id: 'camp', kinds: ['camp'], encounter: { kind: 'camp', rightGrid: p } },
      { id: 'combat', kinds: [], encounter: { kind: 'combat', rightGrid: p } },
    ]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.rightGridByEncounterKind.camp).toBe(p)
    expect(idx.rightGridByEncounterKind.combat).toBe(p)
  })

  it('throws if two mechanics claim the same encounter kind', () => {
    const p: RightGridProvider = () => ({ action: null })
    const mechanics: MechanicDef[] = [
      { id: 'a', kinds: [], encounter: { kind: 'camp', rightGrid: p } },
      { id: 'b', kinds: [], encounter: { kind: 'camp', rightGrid: p } },
    ]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate encounterkind/i)
  })

  it('allows encounter kind without rightGrid (encounter-only mechanics)', () => {
    const idx = buildMechanicIndex([{ id: 'a', kinds: [], encounter: { kind: 'combat' } }])
    expect(idx.rightGridByEncounterKind.combat).toBeUndefined()
  })

  it('indexes reduceAction by encounter kind', () => {
    const reducer: ReduceEncounterAction = (state) => state
    const mechanics: MechanicDef[] = [
      { id: 'camp', kinds: ['camp'], encounter: { kind: 'camp', reduceAction: reducer } },
    ]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.reduceEncounterActionByEncounterKind.camp).toBe(reducer)
  })

  it('indexes combatVariantByKind per kind (one mechanic can supply distinct variants per kind)', () => {
    const testVariant = {} as CombatVariantConfig
    const otherVariant = {} as CombatVariantConfig
    const mechanics: MechanicDef[] = [
      {
        id: 'hazards',
        kinds: ['mountain', 'woods'],
        combatVariantByKind: { mountain: testVariant, woods: otherVariant },
      },
    ]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.combatVariantByKind.mountain).toBe(testVariant)
    expect(idx.combatVariantByKind.woods).toBe(otherVariant)
  })
})
