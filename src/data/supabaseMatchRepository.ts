import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CreateMatchInput, MatchDetails, MatchPlayerStat, MatchRating, MatchResult } from '@/types/match'
import { RepositoryError } from './repository'
import type { MatchRepository } from './matchRepository'

function toMatch(row: Record<string, unknown>): MatchResult {
  return {
    id: row.id as string,
    date: row.date as string,
    teamSize: row.team_size as MatchResult['teamSize'],
    teamAName: row.team_a_name as string,
    teamBName: row.team_b_name as string,
    teamAScore: row.team_a_score as number,
    teamBScore: row.team_b_score as number,
    createdAt: row.created_at as string,
  }
}

function toStat(row: Record<string, unknown>): MatchPlayerStat {
  return {
    matchId: row.match_id as string,
    playerId: row.player_id as string,
    team: row.team as MatchPlayerStat['team'],
    goals: row.goals as number,
    assists: row.assists as number,
  }
}

function toRating(row: Record<string, unknown>): MatchRating {
  return {
    matchId: row.match_id as string,
    raterId: row.rater_id as string,
    ratedId: row.rated_id as string,
    score: row.score as number,
    createdAt: row.created_at as string,
  }
}

export class SupabaseMatchRepository implements MatchRepository {
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey)
  }

  async listMatches(): Promise<MatchResult[]> {
    const { data, error } = await this.client.from('halisaha_matches').select('*').order('date', { ascending: false })
    if (error) throw new RepositoryError(error.message, error.code)
    return (data ?? []).map(toMatch)
  }

  async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    const { data: matchRow, error: matchError } = await this.client
      .from('halisaha_matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle()
    if (matchError) throw new RepositoryError(matchError.message, matchError.code)
    if (!matchRow) return null

    const [{ data: statsRows, error: statsError }, { data: ratingRows, error: ratingError }] = await Promise.all([
      this.client.from('halisaha_match_player_stats').select('*').eq('match_id', matchId),
      this.client.from('halisaha_match_ratings').select('*').eq('match_id', matchId),
    ])
    if (statsError) throw new RepositoryError(statsError.message, statsError.code)
    if (ratingError) throw new RepositoryError(ratingError.message, ratingError.code)

    return {
      match: toMatch(matchRow),
      playerStats: (statsRows ?? []).map(toStat),
      ratings: (ratingRows ?? []).map(toRating),
    }
  }

  async createMatch(input: CreateMatchInput): Promise<MatchResult> {
    const { data: matchRow, error: matchError } = await this.client
      .from('halisaha_matches')
      .insert({
        date: input.date,
        team_size: input.teamSize,
        team_a_name: input.teamAName,
        team_b_name: input.teamBName,
        team_a_score: input.teamAScore,
        team_b_score: input.teamBScore,
      })
      .select('*')
      .single()
    if (matchError) throw new RepositoryError(matchError.message, matchError.code)

    const match = toMatch(matchRow)

    if (input.playerStats.length > 0) {
      const { error: statsError } = await this.client.from('halisaha_match_player_stats').insert(
        input.playerStats.map((s) => ({
          match_id: match.id,
          player_id: s.playerId,
          team: s.team,
          goals: s.goals,
          assists: s.assists,
        })),
      )
      if (statsError) throw new RepositoryError(statsError.message, statsError.code)
    }

    return match
  }

  async submitRating(matchId: string, raterId: string, ratedId: string, score: number): Promise<void> {
    if (raterId === ratedId) throw new RepositoryError('Kendine puan veremezsin.')
    if (score < 1 || score > 10) throw new RepositoryError('Puan 1-10 arasında olmalı.')

    const { error } = await this.client
      .from('halisaha_match_ratings')
      .upsert(
        { match_id: matchId, rater_id: raterId, rated_id: ratedId, score },
        { onConflict: 'match_id,rater_id,rated_id' },
      )
    if (error) throw new RepositoryError(error.message, error.code)
  }

  async listDetailsForPlayers(playerIds: string[]): Promise<MatchDetails[]> {
    if (playerIds.length === 0) return []

    const { data: statRows, error: statError } = await this.client
      .from('halisaha_match_player_stats')
      .select('match_id')
      .in('player_id', playerIds)
    if (statError) throw new RepositoryError(statError.message, statError.code)

    const matchIds = Array.from(new Set((statRows ?? []).map((r) => r.match_id as string)))
    if (matchIds.length === 0) return []

    const [{ data: matchRows, error: matchError }, { data: allStats, error: allStatsError }, { data: allRatings, error: allRatingsError }] =
      await Promise.all([
        this.client.from('halisaha_matches').select('*').in('id', matchIds),
        this.client.from('halisaha_match_player_stats').select('*').in('match_id', matchIds),
        this.client.from('halisaha_match_ratings').select('*').in('match_id', matchIds),
      ])
    if (matchError) throw new RepositoryError(matchError.message, matchError.code)
    if (allStatsError) throw new RepositoryError(allStatsError.message, allStatsError.code)
    if (allRatingsError) throw new RepositoryError(allRatingsError.message, allRatingsError.code)

    return (matchRows ?? []).map((m) => {
      const match = toMatch(m)
      return {
        match,
        playerStats: (allStats ?? []).filter((s) => s.match_id === match.id).map(toStat),
        ratings: (allRatings ?? []).filter((r) => r.match_id === match.id).map(toRating),
      }
    })
  }
}
