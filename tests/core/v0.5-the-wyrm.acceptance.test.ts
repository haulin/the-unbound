import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  WYRM_INITIAL_HEALTH,
  WYRM_PAY_GOLD_COST,
} from '../../src/core/constants'
import { MECHANIC_INDEX } from '../../src/core/mechanics'
import {
  ACTION_COMBAT_PAY,
  ACTION_FIGHT,
  ACTION_RETURN,
} from '../../src/core/mechanics/defs/combat'
import {
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
} from '../../src/core/mechanics/defs/locksmith'
import {
  LAIR_NAME,
  LOCKSMITH_NO_BLOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
  WYRM_BLED_LINES,
  WYRM_FLEE_LINES,
  WYRM_NO_GOLD_LINES,
  WYRM_PAYOFF_LINES,
  WYRM_VICTORY_LINES,
} from '../../src/core/lore'
import { SPRITES } from '../../src/core/spriteIds'
import type { Cell, LairCell, State, World } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

// Acceptance harness mirrors the GWT scenarios in
// `docs/plans/2026-05-29-v0.5-the-wyrm-design.md` § Acceptance specs.
// Worlds are hand-built (no `generateWorld`) so each scenario isolates one
// observable behaviour: locksmith gating, lair entry, fight, pay, flee, bled
// revisit, signpost naming.

function grass(): Cell {
  return { kind: 'grass' }
}

function lair(opts: { isBled?: boolean } = {}): LairCell {
  return {
    kind: 'lair',
    id: 4,
    isBled: opts.isBled ?? false,
  }
}

// 3x3 world with a single feature centered at (1, 1) and the player start at (1, 0).
function makeWorld(center: Cell): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), center, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(world: World, overrides: { food?: number; gold?: number; armySize?: number } = {}): State {
  return {
    world,
    player: { position: { x: 1, y: 0 } },
    run: {
      stepCount: 0,
      hasWon: false,
      isGameOver: false,
      knowsPosition: false,
      path: [],
      lostBufferStartIndex: null,
      copyCursors: {},
    },
    resources: makeResources({
      food: overrides.food ?? 5,
      gold: overrides.gold ?? 0,
      armySize: overrides.armySize ?? 10,
    }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' } },
    pendingEvents: [],
  }
}

const moveSouth = { type: ACTION_MOVE, dx: 0, dy: 1 } as const

function lairCellAt(s: State, x: number, y: number): LairCell {
  const cell = s.world.cells[y]![x]!
  if (cell.kind !== 'lair') throw new Error('expected lair cell')
  return cell
}

describe('v0.5 the wyrm acceptance', () => {
  // A. Locksmith without the Blood
  it('A. visiting locksmith without blood opens no modal and shows no-blood line', () => {
    const s0 = makeState(makeWorld({ kind: 'locksmith' }))
    const after = processAction(s0, moveSouth)!
    expect(after.encounter).toBe(null)
    expect(after.resources.inventory).not.toContain('bronzeKey')
    expect(LOCKSMITH_NO_BLOOD_LINES.some((line) => after.ui.message.includes(line))).toBe(true)
  })

  // B. Locksmith without the Blood, repeated visit
  it('B. revisiting locksmith without blood repeats the no-modal behaviour', () => {
    const s0 = makeState(makeWorld({ kind: 'locksmith' }))
    const onto = processAction(s0, moveSouth)!
    const off = processAction(onto, { type: ACTION_MOVE, dx: 0, dy: -1 })!
    const back = processAction(off, moveSouth)!
    expect(back.encounter).toBe(null)
    expect(back.resources.inventory).not.toContain('bronzeKey')
    expect(LOCKSMITH_NO_BLOOD_LINES.some((line) => back.ui.message.includes(line))).toBe(true)
  })

  // C. First arrival at a Lair opens combat with the wyrm variant UI
  it('C. first arrival at an un-bled lair opens combat with the wyrm-variant right-grid + badges', () => {
    const s0 = makeState(makeWorld(lair()), { gold: WYRM_PAY_GOLD_COST })
    const after = processAction(s0, moveSouth)!
    expect(after.encounter?.kind).toBe('combat')
    const enc = after.encounter
    if (!enc || enc.kind !== 'combat') throw new Error('expected combat encounter')

    // Fixed-spawn wyrm health (no U[playerArmy..2*playerArmy] roll).
    expect(enc.enemyArmySize).toBe(WYRM_INITIAL_HEALTH)

    // Right-grid: Pay (0,1), Fight (1,0), wyrm illustration (1,1), Return (1,2).
    // Variant lookup wires center sprite + Pay button via the source-cell kind.
    const rightGrid = MECHANIC_INDEX.rightGridByEncounterKind.combat
    if (!rightGrid) throw new Error('no combat right-grid registered')
    expect(rightGrid(after, 0, 1)).toMatchObject({
      spriteId: SPRITES.inventory.gold,
      action: { type: ACTION_COMBAT_PAY },
      badge: { variant: 'price', text: `-${WYRM_PAY_GOLD_COST}` },
    })
    expect(rightGrid(after, 1, 0)).toMatchObject({
      spriteId: SPRITES.enemies.wyrm,
      action: { type: ACTION_FIGHT },
      badge: { variant: 'left', text: `${WYRM_INITIAL_HEALTH}` },
    })
    expect(rightGrid(after, 1, 1)).toEqual({ tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null })
    expect(rightGrid(after, 1, 2)).toMatchObject({
      spriteId: SPRITES.actions.return,
      action: { type: ACTION_RETURN },
      badge: { variant: 'price', text: '-1' },
    })
    expect(MECHANIC_INDEX.illustrationByEncounterKind.combat?.(after)).toBe(SPRITES.enemies.wyrm)
  })

  // D. Bleeding the wyrm via Fight
  it('D. fighting the wyrm to 0 health adds blood, flips isBled, and uses victory lines', () => {
    let s = makeState(makeWorld(lair()), { armySize: 200 })
    s = processAction(s, moveSouth)!
    expect(s.encounter?.kind).toBe('combat')

    let safety = 0
    while (s.encounter !== null) {
      const next = processAction(s, { type: ACTION_FIGHT })
      if (!next) throw new Error('FIGHT returned null')
      s = next
      if (s.run.isGameOver) throw new Error('player lost the wyrm fight (test seed bad)')
      safety += 1
      if (safety > 200) throw new Error('wyrm fight did not terminate within 200 rounds')
    }

    expect(s.resources.inventory).toContain('bloodVial')
    const lairAfter = lairCellAt(s, 1, 1)
    expect(lairAfter.isBled).toBe(true)
    expect(WYRM_VICTORY_LINES.some((line) => s.ui.message.includes(line))).toBe(true)
  })

  // E. Bribing the wyrm with Pay (sufficient gold)
  it('E. paying with sufficient gold adds blood, flips isBled, and uses payoff lines', () => {
    let s = makeState(makeWorld(lair()), { gold: WYRM_PAY_GOLD_COST + 5 })
    s = processAction(s, moveSouth)!
    expect(s.encounter?.kind).toBe('combat')
    const goldBefore = s.resources.gold

    s = processAction(s, { type: ACTION_COMBAT_PAY })!
    expect(s.encounter).toBe(null)
    expect(s.resources.gold).toBe(goldBefore - WYRM_PAY_GOLD_COST)
    expect(s.resources.inventory).toContain('bloodVial')
    const lairAfter = lairCellAt(s, 1, 1)
    expect(lairAfter.isBled).toBe(true)
    expect(WYRM_PAYOFF_LINES.some((line) => s.ui.message.includes(line))).toBe(true)
  })

  // F. Bribing the wyrm with Pay (insufficient gold)
  it('F. paying with insufficient gold leaves encounter open and uses no-gold lines', () => {
    let s = makeState(makeWorld(lair()), { gold: WYRM_PAY_GOLD_COST - 1 })
    s = processAction(s, moveSouth)!
    const goldBefore = s.resources.gold

    s = processAction(s, { type: ACTION_COMBAT_PAY })!
    expect(s.encounter?.kind).toBe('combat')
    expect(s.resources.gold).toBe(goldBefore)
    expect(s.resources.inventory).not.toContain('bloodVial')
    expect(WYRM_NO_GOLD_LINES.some((line) => s.ui.message.includes(line))).toBe(true)
  })

  // G. Fleeing the wyrm
  it('G. fleeing the wyrm closes the encounter, costs 1 troop, and uses flee lines', () => {
    let s = makeState(makeWorld(lair()), { armySize: 5 })
    s = processAction(s, moveSouth)!
    const armyBefore = s.resources.armySize

    s = processAction(s, { type: ACTION_RETURN })!
    expect(s.encounter).toBe(null)
    expect(s.resources.armySize).toBe(armyBefore - 1)
    expect(s.resources.inventory).not.toContain('bloodVial')
    const lairAfter = lairCellAt(s, 1, 1)
    expect(lairAfter.isBled).toBe(false)
    expect(WYRM_FLEE_LINES.some((line) => s.ui.message.includes(line))).toBe(true)
  })

  // H. Locksmith with the Blood + gold payment
  it('H. locksmith pay-gold (with blood) grants the key, removes blood, and uses purchase lines', () => {
    const s0 = makeState(makeWorld({ kind: 'locksmith' }), { gold: LOCKSMITH_KEY_GOLD_COST })
    s0.resources.inventory.push('bloodVial')
    const onto = processAction(s0, moveSouth)!
    expect(onto.encounter?.kind).toBe('locksmith')

    const paid = processAction(onto, { type: ACTION_LOCKSMITH_PAY_GOLD })!
    expect(paid.resources.inventory).toContain('bronzeKey')
    expect(paid.resources.inventory).not.toContain('bloodVial')
    expect(paid.resources.gold).toBe(0)
    expect(LOCKSMITH_PURCHASE_LINES.some((line) => paid.ui.message.includes(line))).toBe(true)

    // The locksmith pay-success path auto-closes the encounter (v0.5 UI
    // intermezzo: `applyDeltasAndClose`) — no explicit LEAVE needed. The
    // success purchase line is preserved on exit (not replaced with the
    // tile-enter message the way LEAVE would do).
    expect(paid.encounter).toBe(null)

    // Spec S11: revisiting the locksmith after the key is forged routes
    // through the bronzeKey-held arm of `onEnterLocksmith` — inline
    // `LOCKSMITH_VISITED_LINES`, no modal. The blood was consumed on
    // purchase, so re-entry must NOT fall back to the no-blood arm.
    const off = processAction(paid, { type: ACTION_MOVE, dx: 0, dy: -1 })!
    const back = processAction(off, moveSouth)!
    expect(back.encounter).toBe(null)
    expect(LOCKSMITH_VISITED_LINES.some((line) => back.ui.message.includes(line))).toBe(true)
    expect(LOCKSMITH_NO_BLOOD_LINES.some((line) => back.ui.message.includes(line))).toBe(false)
  })

  // I. Locksmith with the Blood + food payment
  it('I. locksmith pay-food (with blood) grants the key, removes blood, and uses purchase lines', () => {
    const s0 = makeState(makeWorld({ kind: 'locksmith' }), { food: LOCKSMITH_KEY_FOOD_COST + 1 })
    s0.resources.inventory.push('bloodVial')
    const onto = processAction(s0, moveSouth)!
    const paid = processAction(onto, { type: ACTION_LOCKSMITH_PAY_FOOD })!
    expect(paid.resources.inventory).toContain('bronzeKey')
    expect(paid.resources.inventory).not.toContain('bloodVial')
    expect(paid.resources.food).toBe(0)
    expect(LOCKSMITH_PURCHASE_LINES.some((line) => paid.ui.message.includes(line))).toBe(true)

    // Same auto-close + visited-lines re-entry as spec H.
    expect(paid.encounter).toBe(null)
    const off = processAction(paid, { type: ACTION_MOVE, dx: 0, dy: -1 })!
    const back = processAction(off, moveSouth)!
    expect(back.encounter).toBe(null)
    expect(LOCKSMITH_VISITED_LINES.some((line) => back.ui.message.includes(line))).toBe(true)
  })

  // J. Lair after the bleed
  it('J. revisiting a bled lair opens no encounter and uses bled lines', () => {
    const s0 = makeState(makeWorld(lair({ isBled: true })))
    const after = processAction(s0, moveSouth)!
    expect(after.encounter).toBe(null)
    expect(after.resources.inventory).not.toContain('bloodVial')
    expect(WYRM_BLED_LINES.some((line) => after.ui.message.includes(line))).toBe(true)
  })

  // K. Signpost points to the Lair
  it("K. signposts pointing at a lair show the lair's display name", () => {
    // Layout: signpost at (1,0), lair at (1,1). Place the signpost at the
    // start position directly so the signpost message renders the moment
    // the player steps onto it (no further movement needed).
    const w: World = {
      seed: 1,
      width: 3,
      height: 3,
      mapGenAlgorithm: 'TEST',
      cells: [
        [grass(), { kind: 'signpost' }, grass()],
        [grass(), lair(), grass()],
        [grass(), grass(), grass()],
      ],
      rngState: 1,
    }
    const s0 = makeState(w)
    s0.player.position = { x: 0, y: 0 }
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(onto.ui.message).toContain(LAIR_NAME)
  })
})
