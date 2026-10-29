import { describe, expect, it } from 'vitest'
import { balanceTeams, type Constraint } from '@/lib/balancer'
import { FORMATIONS } from '@/lib/formations'
import type { Player, Position } from '@/types/player'

function makePlayer(id: string, positions: Position[], mainPosition: Position, overrides: Partial<Player['stats']> = {}): Player {
  return {
    id,
    name: id,
    positions,
    mainPosition,
    stats: {
      pace: 60,
      shooting: 60,
      passing: 60,
      dribbling: 60,
      defending: 60,
      physical: 60,
      ...overrides,
    },
    avatarType: 'initial',
    avatarValue: id[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function makeRoster(n: number): Player[] {
  const positions: Position[] = ['KL', 'DEF', 'OS', 'FOR']
  const players: Player[] = []
  for (let i = 0; i < n; i++) {
    const main = i === 0 || i === n / 2 ? 'KL' : positions[1 + (i % 3)]
    players.push(makePlayer(`p${i}`, [main], main, { pace: 50 + i, shooting: 50 + ((i * 3) % 40) }))
  }
  return players
}

describe('balanceTeams', () => {
  it('5v5 için iki eşit boyutlu takım üretir', () => {
    const players = makeRoster(10)
    const formation = FORMATIONS[5][0]
    const result = balanceTeams({ players, teamSize: 5, formation, seed: 42, iterations: 100, restarts: 3 })
    expect(result.alternatives.length).toBeGreaterThan(0)
    const alt = result.alternatives[0]
    expect(alt.teamA.slots.length).toBe(5)
    expect(alt.teamB.slots.length).toBe(5)
  })

  it('aynı seed aynı sonucu verir', () => {
    const players = makeRoster(10)
    const formation = FORMATIONS[5][0]
    const result1 = balanceTeams({ players, teamSize: 5, formation, seed: 123, iterations: 150, restarts: 4 })
    const result2 = balanceTeams({ players, teamSize: 5, formation, seed: 123, iterations: 150, restarts: 4 })
    expect(result1.alternatives[0].score).toBe(result2.alternatives[0].score)
    const idsA1 = result1.alternatives[0].teamA.slots.map((s) => s.player.id).sort()
    const idsA2 = result2.alternatives[0].teamA.slots.map((s) => s.player.id).sort()
    expect(idsA1).toEqual(idsA2)
  })

  it('lockedTeam kısıtını uygular', () => {
    const players = makeRoster(10)
    const formation = FORMATIONS[5][0]
    const constraints: Constraint[] = [{ type: 'lockedTeam', playerIds: ['p0'], team: 'A' }]
    const result = balanceTeams({ players, teamSize: 5, formation, seed: 1, constraints, iterations: 100, restarts: 3 })
    const inTeamA = result.alternatives[0].teamA.slots.some((s) => s.player.id === 'p0')
    expect(inTeamA).toBe(true)
  })

  it('apart kısıtı ihlal edilirse ciddi skor cezası uygular', () => {
    const players = makeRoster(10)
    const formation = FORMATIONS[5][0]
    const constraints: Constraint[] = [{ type: 'apart', playerIds: ['p0', 'p1'] }]
    const result = balanceTeams({ players, teamSize: 5, formation, seed: 7, constraints, iterations: 200, restarts: 5 })
    const teamAIds = new Set(result.alternatives[0].teamA.slots.map((s) => s.player.id))
    const sameTeam = teamAIds.has('p0') === teamAIds.has('p1')
    expect(sameTeam).toBe(false)
  })

  it('beklenmeyen oyuncu sayısında uyarı üretir', () => {
    const players = makeRoster(7)
    const formation = FORMATIONS[5][0]
    const result = balanceTeams({ players, teamSize: 5, formation, seed: 1, iterations: 50, restarts: 2 })
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
