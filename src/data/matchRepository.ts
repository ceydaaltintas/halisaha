import type { CreateMatchInput, MatchDetails, MatchResult } from '@/types/match'

/** Maç sonucu / istatistik / puanlama için veri katmanı soyutlaması.
 * PlayerRepository'den ayrı tutulur çünkü farklı bir veri kümesidir, ama aynı
 * localStorage-öncelikli / Supabase-opsiyonel prensibini izler. */
export interface MatchRepository {
  listMatches(): Promise<MatchResult[]>
  getMatchDetails(matchId: string): Promise<MatchDetails | null>
  createMatch(input: CreateMatchInput): Promise<MatchResult>
  submitRating(matchId: string, raterId: string, ratedId: string, score: number): Promise<void>
  /** Belirli oyuncuların geçmiş maçlarını/puanlarını tek seferde getirir (form hesaplaması için). */
  listDetailsForPlayers(playerIds: string[]): Promise<MatchDetails[]>
}
