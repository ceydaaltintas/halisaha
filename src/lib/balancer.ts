import { solveAssignment } from './assignment'
import { formationToSlots, type Formation, type TeamSize } from './formations'
import { positionRatingFor } from './ratings'
import type { Player, PlayerStats, Position } from '@/types/player'

export type TeamId = 'A' | 'B'

export type ConstraintType = 'together' | 'apart' | 'mustGoalkeeper' | 'lockedTeam'

export interface Constraint {
  type: ConstraintType
  /** 'together' / 'apart' için 2 id; 'mustGoalkeeper' / 'lockedTeam' için 1 id. */
  playerIds: string[]
  /** 'lockedTeam' için zorunlu. */
  team?: TeamId
}

export interface ObjectiveWeights {
  totalDiff: number
  sectionDiff: number
  positionPenalty: number
  statProfileDiff: number
  constraintPenalty: number
}

export const DEFAULT_WEIGHTS: ObjectiveWeights = {
  totalDiff: 1,
  sectionDiff: 0.6,
  positionPenalty: 2,
  statProfileDiff: 0.25,
  constraintPenalty: 50,
}

export interface SlotAssignment {
  slotIndex: number
  position: Position
  player: Player
  rating: number
  outOfPosition: boolean
}

export interface TeamResult {
  team: TeamId
  slots: SlotAssignment[]
  totalRating: number
  sectionRatings: Record<Position, number>
  statTotals: Omit<PlayerStats, 'goalkeeping'>
}

export interface ScoreBreakdown {
  totalDiff: number
  sectionDiff: number
  positionPenalty: number
  statProfileDiff: number
  constraintPenalty: number
}

export interface BalanceAlternative {
  teamA: TeamResult
  teamB: TeamResult
  score: number
  breakdown: ScoreBreakdown
  seed: number
}

export interface BalancerInput {
  players: Player[]
  teamSize: TeamSize
  formation: Formation
  constraints?: Constraint[]
  seed?: number
  weights?: Partial<ObjectiveWeights>
  alternativesCount?: number
  /** İç döngü sayısı; test ortamında küçültmek için dışa açık. */
  iterations?: number
  restarts?: number
  /** Geçmiş maç performansından türetilen, oyuncu id'sine göre OVR düzeltmesi
   * (bkz. lib/form.ts). Kart statlarını değiştirmez, sadece bu dengeleme
   * çalıştırmasında kullanılan puanı geçici olarak kaydırır. */
  formAdjustments?: Record<string, number>
}

export interface BalanceOutput {
  alternatives: BalanceAlternative[]
  warnings: string[]
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const EMPTY_STAT_TOTALS: Omit<PlayerStats, 'goalkeeping'> = {
  pace: 0,
  shooting: 0,
  passing: 0,
  dribbling: 0,
  defending: 0,
  physical: 0,
}

function effectiveRating(player: Player, position: Position, formAdjustments: Record<string, number>): number {
  const base = positionRatingFor(player, position)
  const delta = formAdjustments[player.id] ?? 0
  return Math.max(1, Math.min(99, base + delta))
}

function assignSlots(
  team: TeamId,
  players: Player[],
  slots: Position[],
  formAdjustments: Record<string, number>,
): TeamResult {
  // cost[i][j] = oyuncu i'nin slot j'ye (slots[j] pozisyonuna) atanma maliyeti.
  // Maliyeti en aza indirmek = puanı en çoğa çıkarmak, bu yüzden negatif puan kullanılır.
  // Pozisyonu işaretlenmemişse rating fonksiyonu zaten düşük puan verir; burada ayrıca
  // ek bir sabit ceza eklenir ki balancer bu atamadan olabildiğince kaçınsın.
  const cost: number[][] = players.map((p) =>
    slots.map((slot) => {
      const rating = effectiveRating(p, slot, formAdjustments)
      const outOfPosition = !p.positions.includes(slot)
      return -rating + (outOfPosition ? 60 : 0)
    }),
  )

  const { assignment } = solveAssignment(cost)

  const resultSlots: SlotAssignment[] = assignment.map((slotIdx, playerIdx) => {
    const player = players[playerIdx]
    const position = slots[slotIdx]
    return {
      slotIndex: slotIdx,
      position,
      player,
      rating: effectiveRating(player, position, formAdjustments),
      outOfPosition: !player.positions.includes(position),
    }
  })
  resultSlots.sort((a, b) => a.slotIndex - b.slotIndex)

  const sectionRatings: Record<Position, number> = { KL: 0, DEF: 0, OS: 0, FOR: 0 }
  const statTotals = { ...EMPTY_STAT_TOTALS }
  let totalRating = 0
  for (const s of resultSlots) {
    totalRating += s.rating
    sectionRatings[s.position] += s.rating
    statTotals.pace += s.player.stats.pace
    statTotals.shooting += s.player.stats.shooting
    statTotals.passing += s.player.stats.passing
    statTotals.dribbling += s.player.stats.dribbling
    statTotals.defending += s.player.stats.defending
    statTotals.physical += s.player.stats.physical
  }

  return { team, slots: resultSlots, totalRating, sectionRatings, statTotals }
}

function constraintPenalty(split: Record<string, TeamId>, constraints: Constraint[]): number {
  let violations = 0
  for (const c of constraints) {
    if (c.type === 'together') {
      const [a, b] = c.playerIds
      if (split[a] !== undefined && split[b] !== undefined && split[a] !== split[b]) violations++
    } else if (c.type === 'apart') {
      const [a, b] = c.playerIds
      if (split[a] !== undefined && split[b] !== undefined && split[a] === split[b]) violations++
    } else if (c.type === 'lockedTeam') {
      const [a] = c.playerIds
      if (split[a] !== undefined && c.team && split[a] !== c.team) violations++
    }
    // 'mustGoalkeeper' atama aşamasında (slot seçiminde) ele alınır, takım
    // bölünmesiyle ilgisi yoktur; aşağıda evaluateSplit içinde kontrol edilir.
  }
  return violations
}

function mustGoalkeeperPenalty(teamA: TeamResult, teamB: TeamResult, constraints: Constraint[]): number {
  let violations = 0
  const gkConstraints = constraints.filter((c) => c.type === 'mustGoalkeeper')
  for (const c of gkConstraints) {
    const playerId = c.playerIds[0]
    const inA = teamA.slots.find((s) => s.player.id === playerId)
    const inB = teamB.slots.find((s) => s.player.id === playerId)
    const slot = inA ?? inB
    if (!slot || slot.position !== 'KL') violations++
  }
  return violations
}

function evaluateSplit(
  players: Player[],
  teamAIds: Set<string>,
  slots: Position[],
  constraints: Constraint[],
  weights: ObjectiveWeights,
  formAdjustments: Record<string, number>,
): { teamA: TeamResult; teamB: TeamResult; score: number; breakdown: ScoreBreakdown } {
  const teamAPlayers = players.filter((p) => teamAIds.has(p.id))
  const teamBPlayers = players.filter((p) => !teamAIds.has(p.id))

  const teamA = assignSlots('A', teamAPlayers, slots, formAdjustments)
  const teamB = assignSlots('B', teamBPlayers, slots, formAdjustments)

  const totalDiff = Math.abs(teamA.totalRating - teamB.totalRating)

  const sectionDiff = (['KL', 'DEF', 'OS', 'FOR'] as Position[]).reduce(
    (sum, pos) => sum + Math.abs(teamA.sectionRatings[pos] - teamB.sectionRatings[pos]),
    0,
  )

  const positionPenaltyCount =
    teamA.slots.filter((s) => s.outOfPosition).length + teamB.slots.filter((s) => s.outOfPosition).length

  const statKeys: (keyof typeof teamA.statTotals)[] = [
    'pace',
    'shooting',
    'passing',
    'dribbling',
    'defending',
    'physical',
  ]
  const statProfileDiff = statKeys.reduce(
    (sum, key) => sum + Math.abs(teamA.statTotals[key] - teamB.statTotals[key]),
    0,
  )

  const split: Record<string, TeamId> = {}
  for (const p of players) split[p.id] = teamAIds.has(p.id) ? 'A' : 'B'
  const constraintViolations =
    constraintPenalty(split, constraints) + mustGoalkeeperPenalty(teamA, teamB, constraints)

  const breakdown: ScoreBreakdown = {
    totalDiff: totalDiff * weights.totalDiff,
    sectionDiff: sectionDiff * weights.sectionDiff,
    positionPenalty: positionPenaltyCount * weights.positionPenalty,
    statProfileDiff: statProfileDiff * weights.statProfileDiff,
    constraintPenalty: constraintViolations * weights.constraintPenalty,
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return { teamA, teamB, score, breakdown }
}

function randomInitialSplit(players: Player[], teamSize: number, constraints: Constraint[], rand: () => number): Set<string> {
  const ids = players.map((p) => p.id)
  const locked = new Map<string, TeamId>()
  for (const c of constraints) {
    if (c.type === 'lockedTeam' && c.team) locked.set(c.playerIds[0], c.team)
  }

  const teamAIds = new Set<string>()
  const remaining: string[] = []
  let countA = 0
  for (const id of ids) {
    const lock = locked.get(id)
    if (lock === 'A') {
      teamAIds.add(id)
      countA++
    } else if (lock === 'B') {
      // teamB, do nothing
    } else {
      remaining.push(id)
    }
  }

  const shuffled = shuffle(remaining, rand)
  for (const id of shuffled) {
    if (countA < teamSize) {
      teamAIds.add(id)
      countA++
    }
  }
  return teamAIds
}

function cloneSplit(s: Set<string>): Set<string> {
  return new Set(s)
}

function localSearch(
  players: Player[],
  teamSize: number,
  slots: Position[],
  constraints: Constraint[],
  weights: ObjectiveWeights,
  formAdjustments: Record<string, number>,
  rand: () => number,
  iterations: number,
): { teamAIds: Set<string>; score: number } {
  let current = randomInitialSplit(players, teamSize, constraints, rand)
  let currentEval = evaluateSplit(players, current, slots, constraints, weights, formAdjustments)
  let best = cloneSplit(current)
  let bestScore = currentEval.score

  const locked = new Set(
    constraints.filter((c) => c.type === 'lockedTeam').map((c) => c.playerIds[0]),
  )
  const swappable = players.map((p) => p.id).filter((id) => !locked.has(id))

  let temperature = 8
  const coolingRate = 0.97

  for (let iter = 0; iter < iterations; iter++) {
    if (swappable.length < 2) break
    const a = swappable[Math.floor(rand() * swappable.length)]
    let b = swappable[Math.floor(rand() * swappable.length)]
    let tries = 0
    while (b === a && tries < 10) {
      b = swappable[Math.floor(rand() * swappable.length)]
      tries++
    }
    if (a === b) continue

    const aInTeamA = current.has(a)
    const bInTeamA = current.has(b)
    if (aInTeamA === bInTeamA) continue // takas yalnızca farklı takımlardaki oyuncular arasında anlamlı

    const candidate = cloneSplit(current)
    if (aInTeamA) {
      candidate.delete(a)
      candidate.add(b)
    } else {
      candidate.delete(b)
      candidate.add(a)
    }

    const candidateEval = evaluateSplit(players, candidate, slots, constraints, weights, formAdjustments)
    const delta = candidateEval.score - currentEval.score

    if (delta < 0 || rand() < Math.exp(-delta / Math.max(temperature, 0.01))) {
      current = candidate
      currentEval = candidateEval
      if (currentEval.score < bestScore) {
        bestScore = currentEval.score
        best = cloneSplit(current)
      }
    }

    temperature *= coolingRate
  }

  return { teamAIds: best, score: bestScore }
}

function splitKey(players: Player[], teamAIds: Set<string>): string {
  return players
    .map((p) => p.id)
    .filter((id) => teamAIds.has(id))
    .sort()
    .join(',')
}

export function balanceTeams(input: BalancerInput): BalanceOutput {
  const warnings: string[] = []
  const { players, teamSize, formation, constraints = [] } = input
  const weights: ObjectiveWeights = { ...DEFAULT_WEIGHTS, ...input.weights }
  const alternativesCount = input.alternativesCount ?? 5
  const iterations = input.iterations ?? 400
  const restarts = input.restarts ?? 8
  const formAdjustments = input.formAdjustments ?? {}

  const expectedCount = teamSize * 2
  if (players.length !== expectedCount) {
    warnings.push(
      `Seçili oyuncu sayısı (${players.length}) beklenen ${expectedCount} değil. Sonuçlar güvenilir olmayabilir.`,
    )
  }

  const slots = formationToSlots(formation)
  if (slots.length !== teamSize) {
    warnings.push(`Diziliş slot sayısı (${slots.length}) takım büyüklüğüyle (${teamSize}) uyuşmuyor.`)
  }

  const baseSeed = input.seed ?? Date.now() & 0xffffffff
  const results: { teamAIds: Set<string>; score: number; seed: number }[] = []

  for (let r = 0; r < restarts; r++) {
    const seed = baseSeed + r * 7919
    const rand = mulberry32(seed)
    const { teamAIds, score } = localSearch(players, teamSize, slots, constraints, weights, formAdjustments, rand, iterations)
    results.push({ teamAIds, score, seed })
  }

  results.sort((a, b) => a.score - b.score)

  const seen = new Set<string>()
  const alternatives: BalanceAlternative[] = []
  for (const r of results) {
    const key = splitKey(players, r.teamAIds)
    if (seen.has(key)) continue
    seen.add(key)
    const evalResult = evaluateSplit(players, r.teamAIds, slots, constraints, weights, formAdjustments)
    alternatives.push({ teamA: evalResult.teamA, teamB: evalResult.teamB, score: evalResult.score, breakdown: evalResult.breakdown, seed: r.seed })
    if (alternatives.length >= alternativesCount) break
  }

  if (alternatives.length === 0) {
    warnings.push('Takımlar oluşturulamadı: yeterli oyuncu yok.')
  }

  return { alternatives, warnings }
}

function recomputeTeamResult(team: TeamId, slots: SlotAssignment[]): TeamResult {
  const sectionRatings: Record<Position, number> = { KL: 0, DEF: 0, OS: 0, FOR: 0 }
  const statTotals = { ...EMPTY_STAT_TOTALS }
  let totalRating = 0
  for (const s of slots) {
    totalRating += s.rating
    sectionRatings[s.position] += s.rating
    statTotals.pace += s.player.stats.pace
    statTotals.shooting += s.player.stats.shooting
    statTotals.passing += s.player.stats.passing
    statTotals.dribbling += s.player.stats.dribbling
    statTotals.defending += s.player.stats.defending
    statTotals.physical += s.player.stats.physical
  }
  return { team, slots, totalRating, sectionRatings, statTotals }
}

/** İki oyuncunun (aynı takımda veya farklı takımlarda) slotlarını birbiriyle
 * değiştirir ve her iki takımın toplamlarını yeniden hesaplar. Balancer'ı
 * tekrar çalıştırmadan anlık manuel takas için kullanılır. */
export function applySwap(
  teamA: TeamResult,
  teamB: TeamResult,
  playerIdX: string,
  playerIdY: string,
  formAdjustments: Record<string, number> = {},
): { teamA: TeamResult; teamB: TeamResult } {
  const allSlots = [...teamA.slots, ...teamB.slots]
  const slotX = allSlots.find((s) => s.player.id === playerIdX)
  const slotY = allSlots.find((s) => s.player.id === playerIdY)
  if (!slotX || !slotY) return { teamA, teamB }

  const playerX = slotX.player
  const playerY = slotY.player

  function rebuild(slots: SlotAssignment[]): SlotAssignment[] {
    return slots.map((s) => {
      if (s.player.id === playerIdX) {
        return { ...s, player: playerY, rating: effectiveRating(playerY, s.position, formAdjustments), outOfPosition: !playerY.positions.includes(s.position) }
      }
      if (s.player.id === playerIdY) {
        return { ...s, player: playerX, rating: effectiveRating(playerX, s.position, formAdjustments), outOfPosition: !playerX.positions.includes(s.position) }
      }
      return s
    })
  }

  return {
    teamA: recomputeTeamResult('A', rebuild(teamA.slots)),
    teamB: recomputeTeamResult('B', rebuild(teamB.slots)),
  }
}
