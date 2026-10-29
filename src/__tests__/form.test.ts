import { describe, expect, it } from 'vitest'
import { computePlayerFormSummary } from '@/lib/form'
import type { MatchDetails } from '@/types/match'

function makeMatch(id: string, date: string, teamAScore: number, teamBScore: number): MatchDetails['match'] {
  return {
    id,
    date,
    teamSize: 5,
    teamAName: 'Kırmızı',
    teamBName: 'Mavi',
    teamAScore,
    teamBScore,
    createdAt: date,
  }
}

describe('computePlayerFormSummary', () => {
  it('maç oynamamış oyuncu için 0 form düzeltmesi döner', () => {
    const summary = computePlayerFormSummary('p1', [])
    expect(summary.matchesPlayed).toBe(0)
    expect(summary.formAdjustment).toBe(0)
  })

  it('çok kazanan ve yüksek puan alan oyuncuya pozitif form ekler', () => {
    const details: MatchDetails[] = [1, 2, 3].map((i) => ({
      match: makeMatch(`m${i}`, `2026-01-0${i}`, 5, 1),
      playerStats: [{ matchId: `m${i}`, playerId: 'p1', team: 'A', goals: 2, assists: 1 }],
      ratings: [{ matchId: `m${i}`, raterId: 'other', ratedId: 'p1', score: 9, createdAt: '2026-01-01' }],
    }))

    const summary = computePlayerFormSummary('p1', details)
    expect(summary.matchesPlayed).toBe(3)
    expect(summary.winRate).toBe(1)
    expect(summary.formAdjustment).toBeGreaterThan(0)
  })

  it('çok kaybeden ve düşük puan alan oyuncuya negatif form ekler', () => {
    const details: MatchDetails[] = [1, 2, 3].map((i) => ({
      match: makeMatch(`m${i}`, `2026-01-0${i}`, 1, 5),
      playerStats: [{ matchId: `m${i}`, playerId: 'p1', team: 'A', goals: 0, assists: 0 }],
      ratings: [{ matchId: `m${i}`, raterId: 'other', ratedId: 'p1', score: 2, createdAt: '2026-01-01' }],
    }))

    const summary = computePlayerFormSummary('p1', details)
    expect(summary.formAdjustment).toBeLessThan(0)
  })

  it('sadece son FORM_WINDOW kadar maçı dikkate alır', () => {
    const oldDetails: MatchDetails[] = Array.from({ length: 3 }, (_, i) => ({
      match: makeMatch(`old${i}`, `2025-01-0${i + 1}`, 1, 5),
      playerStats: [{ matchId: `old${i}`, playerId: 'p1', team: 'A', goals: 0, assists: 0 }],
      ratings: [],
    }))
    const recentDetails: MatchDetails[] = Array.from({ length: 5 }, (_, i) => ({
      match: makeMatch(`new${i}`, `2026-02-0${i + 1}`, 5, 1),
      playerStats: [{ matchId: `new${i}`, playerId: 'p1', team: 'A', goals: 1, assists: 0 }],
      ratings: [],
    }))

    const summary = computePlayerFormSummary('p1', [...oldDetails, ...recentDetails])
    expect(summary.matchesPlayed).toBe(5)
    expect(summary.winRate).toBe(1)
  })
})
