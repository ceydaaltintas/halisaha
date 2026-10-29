import type { CreateMatchInput, MatchDetails, MatchPlayerStat, MatchRating, MatchResult } from '@/types/match'
import type { MatchRepository } from './matchRepository'

const MATCHES_KEY = 'halisaha_matches_v1'
const STATS_KEY = 'halisaha_match_stats_v1'
const RATINGS_KEY = 'halisaha_match_ratings_v1'

function readJson<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

function writeJson<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export class LocalStorageMatchRepository implements MatchRepository {
  async listMatches(): Promise<MatchResult[]> {
    return readJson<MatchResult>(MATCHES_KEY).sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    const match = readJson<MatchResult>(MATCHES_KEY).find((m) => m.id === matchId)
    if (!match) return null
    const playerStats = readJson<MatchPlayerStat>(STATS_KEY).filter((s) => s.matchId === matchId)
    const ratings = readJson<MatchRating>(RATINGS_KEY).filter((r) => r.matchId === matchId)
    return { match, playerStats, ratings }
  }

  async createMatch(input: CreateMatchInput): Promise<MatchResult> {
    const match: MatchResult = {
      id: crypto.randomUUID(),
      date: input.date,
      teamSize: input.teamSize,
      teamAName: input.teamAName,
      teamBName: input.teamBName,
      teamAScore: input.teamAScore,
      teamBScore: input.teamBScore,
      createdAt: new Date().toISOString(),
    }

    const matches = readJson<MatchResult>(MATCHES_KEY)
    matches.push(match)
    writeJson(MATCHES_KEY, matches)

    const stats = readJson<MatchPlayerStat>(STATS_KEY)
    for (const s of input.playerStats) {
      stats.push({ ...s, matchId: match.id })
    }
    writeJson(STATS_KEY, stats)

    return match
  }

  async submitRating(matchId: string, raterId: string, ratedId: string, score: number): Promise<void> {
    if (raterId === ratedId) throw new Error('Kendine puan veremezsin.')
    if (score < 1 || score > 10) throw new Error('Puan 1-10 arasında olmalı.')

    const ratings = readJson<MatchRating>(RATINGS_KEY)
    const existingIdx = ratings.findIndex((r) => r.matchId === matchId && r.raterId === raterId && r.ratedId === ratedId)
    const rating: MatchRating = { matchId, raterId, ratedId, score, createdAt: new Date().toISOString() }
    if (existingIdx >= 0) ratings[existingIdx] = rating
    else ratings.push(rating)
    writeJson(RATINGS_KEY, ratings)
  }

  async listDetailsForPlayers(playerIds: string[]): Promise<MatchDetails[]> {
    const matches = readJson<MatchResult>(MATCHES_KEY)
    const allStats = readJson<MatchPlayerStat>(STATS_KEY)
    const allRatings = readJson<MatchRating>(RATINGS_KEY)
    const idSet = new Set(playerIds)

    const relevantMatchIds = new Set(allStats.filter((s) => idSet.has(s.playerId)).map((s) => s.matchId))

    return matches
      .filter((m) => relevantMatchIds.has(m.id))
      .map((match) => ({
        match,
        playerStats: allStats.filter((s) => s.matchId === match.id),
        ratings: allRatings.filter((r) => r.matchId === match.id),
      }))
  }
}
