import { describe, expect, it } from 'vitest'
import {
  allPositionRatings,
  calculateOvr,
  isWithinBudget,
  positionRatingFor,
  tierForOvr,
} from '@/lib/ratings'
import type { Player } from '@/types/player'

function makePlayer(overrides: Partial<Player['stats']> = {}, positions: Player['positions'] = ['FOR']): Pick<Player, 'stats' | 'positions' | 'mainPosition'> {
  return {
    stats: {
      pace: 70,
      shooting: 70,
      passing: 70,
      dribbling: 70,
      defending: 70,
      physical: 70,
      ...overrides,
    },
    positions,
    mainPosition: positions[0],
  }
}

describe('calculateOvr', () => {
  it('forvet için şut/hız ağırlıklı yüksek puan verir', () => {
    const striker = makePlayer({ shooting: 90, pace: 90, defending: 30 })
    expect(calculateOvr(striker)).toBeGreaterThan(70)
  })

  it('tüm statlar eşitse OVR o değere eşit olur', () => {
    const flat = makePlayer({ pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 })
    expect(calculateOvr(flat)).toBe(60)
  })

  it('kaleci OVR, KAL puanına ağırlıklı bağlıdır', () => {
    const gk = { ...makePlayer({}, ['KL']), stats: { pace: 50, shooting: 10, passing: 50, dribbling: 10, defending: 60, physical: 60, goalkeeping: 90 } }
    expect(calculateOvr(gk)).toBeGreaterThan(70)
  })
})

describe('positionRatingFor', () => {
  it('işaretlenmemiş pozisyonda ciddi ceza uygular', () => {
    const player = makePlayer({}, ['FOR'])
    const inPos = positionRatingFor(player, 'FOR')
    const outOfPos = positionRatingFor(player, 'DEF')
    expect(outOfPos).toBeLessThan(inPos)
  })

  it('allPositionRatings dört pozisyon için de değer üretir', () => {
    const player = makePlayer({}, ['FOR', 'OS'])
    const ratings = allPositionRatings(player)
    expect(Object.keys(ratings).sort()).toEqual(['DEF', 'FOR', 'KL', 'OS'].sort())
  })
})

describe('isWithinBudget', () => {
  it('bütçeyi aşan statları reddeder', () => {
    const over = { pace: 99, shooting: 99, passing: 99, dribbling: 99, defending: 99, physical: 99 }
    expect(isWithinBudget(over)).toBe(false)
  })

  it('bütçe dahilindeki statları kabul eder', () => {
    const ok = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70 }
    expect(isWithinBudget(ok)).toBe(true)
  })
})

describe('tierForOvr', () => {
  it('eşik değerlerine göre doğru seviyeyi döner', () => {
    expect(tierForOvr(55)).toBe('bronze')
    expect(tierForOvr(65)).toBe('silver')
    expect(tierForOvr(75)).toBe('gold')
    expect(tierForOvr(85)).toBe('special')
  })
})
