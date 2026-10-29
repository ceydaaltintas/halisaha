import type { TeamId } from '@/lib/balancer'
import type { Formation } from '@/lib/formations'
import type { Position } from '@/types/player'

export type Orientation = 'horizontal' | 'vertical'

export interface SlotCoord {
  position: Position
  x: number
  y: number
}

// Pozisyonun kaleden orta çizgiye olan "boylamsal" konumu (0 = kale çizgisi, 1 = orta çizgi).
// Kaleci en dışta, forvetler orta çizgiye yakın durur.
const ALONG_T: Record<Position, number> = { KL: 0.06, DEF: 0.32, OS: 0.58, FOR: 0.84 }

function toXY(alongT: number, acrossT: number, team: TeamId, orientation: Orientation): { x: number; y: number } {
  const across = 10 + acrossT * 80
  const along = team === 'A' ? alongT * 48 + 2 : 98 - (alongT * 48 + 2)
  return orientation === 'horizontal' ? { x: along, y: across } : { x: across, y: along }
}

/** Dizilişteki satırları (KL, DEF, OS, FOR sırasıyla) sahadaki 0-100 koordinat
 * uzayına yerleştirir. Sıralama, balancer.ts'teki formationToSlots ile birebir
 * aynıdır; böylece TeamResult.slots dizisiyle indeks bazlı eşlenebilir. */
export function computeSlotCoords(formation: Formation, team: TeamId, orientation: Orientation): SlotCoord[] {
  const coords: SlotCoord[] = []
  for (const line of formation.lines) {
    const alongT = ALONG_T[line.position]
    for (let i = 0; i < line.count; i++) {
      const acrossT = line.count === 1 ? 0.5 : i / (line.count - 1)
      const { x, y } = toXY(alongT, acrossT, team, orientation)
      coords.push({ position: line.position, x, y })
    }
  }
  return coords
}
