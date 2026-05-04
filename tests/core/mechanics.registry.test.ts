import { describe, expect, it } from 'vitest'
import { buildMechanicIndex } from '../../src/core/mechanics/registry'
import type { MechanicDef } from '../../src/core/mechanics/types'
import type { StartEncounterFn } from '../../src/core/mechanics/types'
import type { RightGridProvider } from '../../src/core/mechanics/types'
import type { TileEnterHandler } from '../../src/core/mechanics/types'
import type { CellKind } from '../../src/core/types'

function mech(
  id: string,
  kinds: readonly CellKind[],
  onEnter?: TileEnterHandler,
  startEncounter?: StartEncounterFn,
): MechanicDef {
  return {
    id,
    kinds,
    ...(onEnter ? { onEnter } : {}),
    ...(startEncounter ? { startEncounter } : {}),
  }
}

describe('mechanics registry', () => {
  const onEnterGate: TileEnterHandler = () => ({ message: '' })

  it('throws if two mechanics share the same id', () => {
    const mechanics = [mech('dup', ['gate'], onEnterGate), mech('dup', ['locksmith'], onEnterGate)]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate mechanic id/i)
  })

  it('throws if two mechanics claim the same kind (even if one has no onEnter)', () => {
    const mechanics = [mech('a', ['gate']), mech('b', ['gate'], onEnterGate)]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate kind ownership/i)
  })

  it('indexes onEnter handlers by kind (including multi-kind ownership)', () => {
    const mechanics = [mech('gate', ['gate', 'gateOpen'], onEnterGate)]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.onEnterByKind.gate).toBe(onEnterGate)
    expect(idx.onEnterByKind.gateOpen).toBe(onEnterGate)
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

  it('indexes startEncounter handlers by kind', () => {
    const startCamp: StartEncounterFn = ({ cellId, restoreMessage }) => ({
      kind: 'camp',
      sourceKind: 'camp',
      sourceCellId: cellId,
      restoreMessage,
    })

    const mechanics = [mech('camp', ['camp'], undefined, startCamp)]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.startEncounterByKind.camp).toBe(startCamp)
  })

  it('indexes rightGrid providers by encounter kind', () => {
    const p: RightGridProvider = () => ({ action: null })
    const mechanics: MechanicDef[] = [
      { id: 'camp', kinds: ['camp'], rightGridEncounterKind: 'camp', rightGrid: p },
      { id: 'combat', kinds: [], rightGridEncounterKind: 'combat', rightGrid: p },
    ]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.rightGridByEncounterKind.camp).toBe(p)
    expect(idx.rightGridByEncounterKind.combat).toBe(p)
  })

  it('throws if two mechanics claim the same rightGridEncounterKind', () => {
    const p: RightGridProvider = () => ({ action: null })
    const mechanics: MechanicDef[] = [
      { id: 'a', kinds: [], rightGridEncounterKind: 'camp', rightGrid: p },
      { id: 'b', kinds: [], rightGridEncounterKind: 'camp', rightGrid: p },
    ]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate.*rightgrid/i)
  })

  it('throws if rightGrid and rightGridEncounterKind are not both set', () => {
    const p: RightGridProvider = () => ({ action: null })
    expect(() => buildMechanicIndex([{ id: 'a', kinds: [], rightGrid: p }])).toThrow(/rightgrid/i)
    expect(() => buildMechanicIndex([{ id: 'b', kinds: [], rightGridEncounterKind: 'camp' }])).toThrow(/rightgrid/i)
  })
})
