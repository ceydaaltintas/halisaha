import type { Position } from '@/types/player'

export type TeamSize = 5 | 6 | 7 | 8

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

export const FORMATIONS: Record<TeamSize, Formation[]> = {
  5: [formation('1-2-1-1', 5, 2, 1, 1), formation('1-1-2-1', 5, 1, 2, 1)],
  6: [formation('1-2-2-1', 6, 2, 2, 1), formation('1-3-1-1', 6, 3, 1, 1)],
  7: [formation('1-3-2-1', 7, 3, 2, 1), formation('1-2-3-1', 7, 2, 3, 1), formation('1-3-1-2', 7, 3, 1, 2)],
  8: [formation('1-3-3-1', 8, 3, 3, 1), formation('1-4-2-1', 8, 4, 2, 1), formation('1-3-2-2', 8, 3, 2, 2)],
}

export function formationSlotCount(f: Formation): number {
  return f.lines.reduce((sum, l) => sum + l.count, 0)
}

/** Diziliş satırlarını, oyuncuların slota göre düzgün biçimde yerleşebileceği
 * flat bir pozisyon listesine çevirir (örn. 1-2-1-1 -> [KL, DEF, DEF, OS, FOR]). */
export function formationToSlots(f: Formation): Position[] {
  return f.lines.flatMap((l) => Array(l.count).fill(l.position) as Position[])
}
