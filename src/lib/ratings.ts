import { APP_CONFIG } from './config'
import type { Player, PlayerStats, PlayerWithRatings, Position } from '@/types/player'

// Her pozisyon için 6 ana statın OVR'a katkı ağırlıkları (toplamı 1).
// Buradaki tabloyu değiştirmek, hem kart OVR'ını hem balancer'ın kullandığı
// pozisyon puanlarını (positionRatings) aynı anda etkiler — tek kaynak burası.
type StatWeights = Record<keyof Omit<PlayerStats, 'goalkeeping'>, number>

export const POSITION_WEIGHTS: Record<Position, StatWeights> = {
  FOR: { pace: 0.25, shooting: 0.3, passing: 0.07, dribbling: 0.2, defending: 0.03, physical: 0.15 },
  OS: { pace: 0.15, shooting: 0.1, passing: 0.3, dribbling: 0.25, defending: 0.05, physical: 0.15 },
  DEF: { pace: 0.15, shooting: 0.03, passing: 0.1, dribbling: 0.07, defending: 0.4, physical: 0.25 },
  // KL için 6 statlık ağırlık tablosu KAL hesaba katılmadan önce "yardımcı"
  // statlar olarak kullanılır; asıl OVR_KL hesabı aşağıda KAL ile harmanlanır.
  KL: { pace: 0.1, shooting: 0, passing: 0.1, dribbling: 0, defending: 0.2, physical: 0.1 },
}

// Kalecilik puanının KL pozisyon OVR'ına katkı oranı; kalanı yukarıdaki
// yardımcı statların toplamından gelir.
const GOALKEEPING_WEIGHT = 0.8

function weightedSix(stats: PlayerStats, weights: StatWeights): number {
  return (
    stats.pace * weights.pace +
    stats.shooting * weights.shooting +
    stats.passing * weights.passing +
    stats.dribbling * weights.dribbling +
    stats.defending * weights.defending +
    stats.physical * weights.physical
  )
}

/** Belirli bir pozisyon için oyuncunun o pozisyondaki (ceza uygulanmamış) ham puanı. */
export function rawPositionRating(stats: PlayerStats, position: Position): number {
  const weights = POSITION_WEIGHTS[position]
  if (position === 'KL') {
    const gk = stats.goalkeeping ?? 1
    const helperWeightSum = Object.values(weights).reduce((a, b) => a + b, 0)
    const helper = weightedSix(stats, weights) / (helperWeightSum || 1)
    return gk * GOALKEEPING_WEIGHT + helper * (1 - GOALKEEPING_WEIGHT)
  }
  return weightedSix(stats, weights)
}

// Oyuncunun işaretlemediği bir pozisyonda oynatılması istendiğinde ham puana
// uygulanan çarpan. Balancer bu düşük puanı zaten "maliyet" olarak kullanır,
// ayrıca balancer.ts içinde ek bir ceza puanı da eklenir.
export const OUT_OF_POSITION_MULTIPLIER = 0.5

/** Oyuncunun belirli bir pozisyonda oynatılırsa alacağı puan (işaretli değilse cezalı). */
export function positionRatingFor(player: Pick<Player, 'stats' | 'positions'>, position: Position): number {
  const raw = rawPositionRating(player.stats, position)
  if (player.positions.includes(position)) return Math.round(raw)
  return Math.round(raw * OUT_OF_POSITION_MULTIPLIER)
}

/** Oyuncunun tüm pozisyonlar için puanları (işaretli olmayanlar cezalı). */
export function allPositionRatings(player: Pick<Player, 'stats' | 'positions'>): Record<Position, number> {
  return {
    KL: positionRatingFor(player, 'KL'),
    DEF: positionRatingFor(player, 'DEF'),
    OS: positionRatingFor(player, 'OS'),
    FOR: positionRatingFor(player, 'FOR'),
  }
}

/** Kart üzerinde gösterilen OVR: ana pozisyona göre hesaplanır, ceza uygulanmaz
 * (ana pozisyon zaten oyuncunun işaretlediği bir pozisyon olmalıdır). */
export function calculateOvr(player: Pick<Player, 'stats' | 'mainPosition'>): number {
  return Math.round(rawPositionRating(player.stats, player.mainPosition))
}

export function statBudgetTotal(stats: PlayerStats): number {
  return stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical
}

export function isWithinBudget(stats: PlayerStats): boolean {
  return statBudgetTotal(stats) <= APP_CONFIG.statBudget
}

export function tierForOvr(ovr: number): PlayerWithRatings['tier'] {
  const { cardTiers } = APP_CONFIG
  if (ovr >= cardTiers.special.min) return 'special'
  if (ovr >= cardTiers.gold.min) return 'gold'
  if (ovr >= cardTiers.silver.min) return 'silver'
  return 'bronze'
}

export function withRatings(player: Player): PlayerWithRatings {
  const ovr = calculateOvr(player)
  return {
    ...player,
    ovr,
    positionRatings: allPositionRatings(player),
    tier: tierForOvr(ovr),
  }
}
