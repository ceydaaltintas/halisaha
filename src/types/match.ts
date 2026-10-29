import type { TeamId } from '@/lib/balancer'
import type { TeamSize } from '@/lib/formations'

export interface MatchResult {
  id: string
  date: string // ISO tarih (maçın oynandığı gün)
  teamSize: TeamSize
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  createdAt: string
}

export interface MatchPlayerStat {
  matchId: string
  playerId: string
  team: TeamId
  goals: number
  assists: number
}

export interface MatchRating {
  matchId: string
  raterId: string
  ratedId: string
  score: number // 1-10
  createdAt: string
}

export interface CreateMatchInput {
  date: string
  teamSize: TeamSize
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  playerStats: Omit<MatchPlayerStat, 'matchId'>[]
}

export interface MatchDetails {
  match: MatchResult
  playerStats: MatchPlayerStat[]
  ratings: MatchRating[]
}

export interface PlayerFormSummary {
  playerId: string
  matchesPlayed: number
  wins: number
  winRate: number
  totalGoals: number
  totalAssists: number
  averageRating: number | null
  /** Balancer'ın OVR'a ekleyeceği geçici düzeltme (-3..+3 aralığında). */
  formAdjustment: number
}
