// Küçük boyutlu (<=10) kare maliyet matrisleri için kaba kuvvet / bitmask DP
// ile en düşük toplam maliyetli atamayı bulur (Macar algoritmasına eşdeğer
// sonuç verir, ama n küçük olduğundan DP ile uygulamak daha az hataya açık).
export interface AssignmentResult {
  assignment: number[] // assignment[i] = i. satıra (oyuncuya) atanan sütun (slot) indeksi
  cost: number
}

export function solveAssignment(cost: number[][]): AssignmentResult {
  const n = cost.length
  if (n === 0) return { assignment: [], cost: 0 }
  const fullMask = (1 << n) - 1
  const INF = Number.POSITIVE_INFINITY

  // dp[mask] = ilk popcount(mask) oyuncu için mask'teki slotları kullanan min maliyet
  // (satır sırasıyla işleniyor: mask'in popcount'u = o ana kadar işlenen oyuncu sayısı)
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(1 << n).fill(INF))
  const parent: number[][] = Array.from({ length: n + 1 }, () => Array(1 << n).fill(-1))
  dp[0][0] = 0

  for (let i = 0; i < n; i++) {
    for (let mask = 0; mask <= fullMask; mask++) {
      if (dp[i][mask] === INF) continue
      // i. oyuncu için kullanılabilir her slotu dene
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue
        const nextMask = mask | (1 << j)
        const candidate = dp[i][mask] + cost[i][j]
        if (candidate < dp[i + 1][nextMask]) {
          dp[i + 1][nextMask] = candidate
          parent[i + 1][nextMask] = j
        }
      }
    }
  }

  const assignment = Array(n).fill(-1)
  let mask = fullMask
  for (let i = n; i > 0; i--) {
    const j = parent[i][mask]
    assignment[i - 1] = j
    mask &= ~(1 << j)
  }

  return { assignment, cost: dp[n][fullMask] }
}
