import type { Position } from '@/types/player'

// Takım başına oyuncu sayısı sınırları (3v3 - tam saha 11v11 arası).
export const MIN_TEAM_SIZE = 3
export const MAX_TEAM_SIZE = 11

export type TeamSize = number

/** Dizilişteki her satır bir pozisyon grubunu ve o gruptaki oyuncu sayısını temsil eder.
 * Satır sırası kaleden forvete doğrudur (sahada yerleşim için de kullanılır). */
export interface FormationLine {
  position: Position
  count: number
}

export interface Formation {
  id: string
  label: string
  teamSize: TeamSize
  lines: FormationLine[]
}

function formation(id: string, teamSize: TeamSize, def: number, mid: number, fwd: number): Formation {
  const allLines: FormationLine[] = [
    { position: 'KL', count: 1 },
    { position: 'DEF', count: def },
    { position: 'OS', count: mid },
    { position: 'FOR', count: fwd },
  ]
  const lines = allLines.filter((l) => l.count > 0)
  return { id, label: id, teamSize, lines }
}

const FORMATION_PRESETS: Record<number, Formation[]> = {
  3: [formation('1-1-1', 3, 1, 0, 1), formation('1-0-2', 3, 0, 1, 1)],
  4: [formation('1-2-1', 4, 2, 0, 1), formation('1-1-2', 4, 1, 1, 1)],
  5: [formation('1-2-1-1', 5, 2, 1, 1), formation('1-1-2-1', 5, 1, 2, 1)],
  6: [formation('1-2-2-1', 6, 2, 2, 1), formation('1-3-1-1', 6, 3, 1, 1)],
  7: [formation('1-3-2-1', 7, 3, 2, 1), formation('1-2-3-1', 7, 2, 3, 1), formation('1-3-1-2', 7, 3, 1, 2)],
  8: [formation('1-3-3-1', 8, 3, 3, 1), formation('1-4-2-1', 8, 4, 2, 1), formation('1-3-2-2', 8, 3, 2, 2)],
  9: [formation('1-3-4-1', 9, 3, 4, 1), formation('1-4-3-1', 9, 4, 3, 1), formation('1-3-3-2', 9, 3, 3, 2)],
  10: [formation('1-4-4-1', 10, 4, 4, 1), formation('1-3-4-2', 10, 3, 4, 2), formation('1-4-3-2', 10, 4, 3, 2)],
  11: [formation('1-4-4-2', 11, 4, 4, 2), formation('1-4-3-3', 11, 4, 3, 3), formation('1-3-5-2', 11, 3, 5, 2)],
}

/** Önceden tanımlı bir tablomuz yoksa (beklenmeyen bir takım büyüklüğü), basit
 * bir oran formülüyle makul bir diziliş üretir — üretim kalitesi elle
 * hazırlanmış tablolardan düşük olabilir ama her zaman geçerli bir diziliş döner. */
function generateFallbackFormation(teamSize: TeamSize): Formation {
  const outfield = Math.max(0, teamSize - 1)
  const def = Math.max(1, Math.round(outfield * 0.4))
  const fwd = Math.max(1, Math.round(outfield * 0.2))
  const mid = Math.max(0, outfield - def - fwd)
  return formation(`1-${def}-${mid}-${fwd}`, teamSize, def, mid, fwd)
}

/** Verilen takım büyüklüğü için kullanılabilir diziliş seçeneklerini döner. */
export function getFormationsForTeamSize(teamSize: TeamSize): Formation[] {
  return FORMATION_PRESETS[teamSize] ?? [generateFallbackFormation(teamSize)]
}

/** Geriye dönük uyumluluk için: yaygın boyutlar (3-11) için hazır tablo. */
export const FORMATIONS = FORMATION_PRESETS

export function formationSlotCount(f: Formation): number {
  return f.lines.reduce((sum, l) => sum + l.count, 0)
}

/** Diziliş satırlarını, oyuncuların slota göre düzgün biçimde yerleşebileceği
 * flat bir pozisyon listesine çevirir (örn. 1-2-1-1 -> [KL, DEF, DEF, OS, FOR]). */
export function formationToSlots(f: Formation): Position[] {
  return f.lines.flatMap((l) => Array(l.count).fill(l.position) as Position[])
}
