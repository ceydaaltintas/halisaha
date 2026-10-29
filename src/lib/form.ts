import type { MatchDetails, PlayerFormSummary } from '@/types/match'

// Form hesaplamasında dikkate alınan son maç sayısı.
const FORM_WINDOW = 5
// OVR'a eklenecek/çıkarılacak maksimum form düzeltmesi.
const MAX_FORM_ADJUSTMENT = 3

function matchWinner(match: MatchDetails['match']): 'A' | 'B' | 'draw' {
  if (match.teamAScore > match.teamBScore) return 'A'
  if (match.teamBScore > match.teamAScore) return 'B'
  return 'draw'
}

/** Bir oyuncunun geçmiş maç detaylarından (en güncel FORM_WINDOW kadarından)
 * özet istatistiklerini ve balancer'ın kullanacağı küçük OVR düzeltmesini üretir. */
export function computePlayerFormSummary(playerId: string, details: MatchDetails[]): PlayerFormSummary {
  return summarize(playerId, details, FORM_WINDOW)
}

/** Tüm maç geçmişi üzerinden (pencere sınırı olmadan) kariyer istatistikleri. */
export function computeCareerStats(playerId: string, details: MatchDetails[]): PlayerFormSummary {
  return summarize(playerId, details, Number.POSITIVE_INFINITY)
}

function summarize(playerId: string, details: MatchDetails[], windowSize: number): PlayerFormSummary {
  const relevant = details
    .filter((d) => d.playerStats.some((s) => s.playerId === playerId))
    .sort((a, b) => (a.match.date < b.match.date ? 1 : -1))
    .slice(0, windowSize)

  let wins = 0
  let totalGoals = 0
  let totalAssists = 0
  const ratings: number[] = []

  for (const detail of relevant) {
    const own = detail.playerStats.find((s) => s.playerId === playerId)
    if (!own) continue
    totalGoals += own.goals
    totalAssists += own.assists
    if (matchWinner(detail.match) === own.team) wins++

    const receivedRatings = detail.ratings.filter((r) => r.ratedId === playerId)
    for (const r of receivedRatings) ratings.push(r.score)
  }

  const matchesPlayed = relevant.length
  const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0
  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  const formAdjustment = computeFormAdjustment(matchesPlayed, winRate, averageRating)

  return { playerId, matchesPlayed, wins, winRate, totalGoals, totalAssists, averageRating, formAdjustment }
}

function computeFormAdjustment(matchesPlayed: number, winRate: number, averageRating: number | null): number {
  if (matchesPlayed === 0) return 0

  // Galibiyet oranı 0.5 (nötr) etrafında -1..+1 aralığına yayılır.
  const winComponent = (winRate - 0.5) * 2

  // Performans puanı 1-10 arası, 5.5 nötr kabul edilir, -2..+2 aralığına yayılır.
  const ratingComponent = averageRating !== null ? ((averageRating - 5.5) / 4.5) * 2 : 0

  const raw = winComponent + ratingComponent
  const clamped = Math.max(-MAX_FORM_ADJUSTMENT, Math.min(MAX_FORM_ADJUSTMENT, raw))
  return Math.round(clamped)
}

/** Birden fazla oyuncu için form özetlerini tek seferde üretir. */
export function computeFormAdjustments(playerIds: string[], details: MatchDetails[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const id of playerIds) {
    result[id] = computePlayerFormSummary(id, details).formAdjustment
  }
  return result
}
