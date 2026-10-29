import { forwardRef, useEffect, useState } from 'react'
import type { TeamResult } from '@/lib/balancer'
import type { Formation } from '@/lib/formations'
import { computeSlotCoords, type Orientation } from './formationLayout'
import { PitchMarkings } from './PitchMarkings'
import { PlayerChip } from './PlayerChip'

interface PitchProps {
  formation: Formation
  teamA: TeamResult
  teamB: TeamResult
  colorA: string
  colorB: string
  selectedPlayerId?: string | null
  onPlayerClick?: (playerId: string) => void
}

function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'vertical' : 'horizontal',
  )
  useEffect(() => {
    function handleResize() {
      setOrientation(window.innerWidth < 768 ? 'vertical' : 'horizontal')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return orientation
}

export const Pitch = forwardRef<HTMLDivElement, PitchProps>(function Pitch(
  { formation, teamA, teamB, colorA, colorB, selectedPlayerId, onPlayerClick },
  ref,
) {
  const orientation = useOrientation()
  const coordsA = computeSlotCoords(formation, 'A', orientation)
  const coordsB = computeSlotCoords(formation, 'B', orientation)

  return (
    <div
      ref={ref}
      className={`relative w-full rounded-2xl overflow-hidden border border-white/10 ${
        orientation === 'horizontal' ? 'aspect-[3/2]' : 'aspect-[2/3]'
      }`}
      style={{
        background:
          'repeating-linear-gradient(' +
          (orientation === 'horizontal' ? '90deg' : '0deg') +
          ', #163a26 0%, #163a26 8%, #1b4430 8%, #1b4430 16%)',
      }}
    >
      <PitchMarkings orientation={orientation} />
      {teamA.slots.map((slot, i) => (
        <PlayerChip
          key={slot.player.id}
          x={coordsA[i].x}
          y={coordsA[i].y}
          slot={slot}
          color={colorA}
          selected={selectedPlayerId === slot.player.id}
          onClick={() => onPlayerClick?.(slot.player.id)}
        />
      ))}
      {teamB.slots.map((slot, i) => (
        <PlayerChip
          key={slot.player.id}
          x={coordsB[i].x}
          y={coordsB[i].y}
          slot={slot}
          color={colorB}
          selected={selectedPlayerId === slot.player.id}
          onClick={() => onPlayerClick?.(slot.player.id)}
        />
      ))}
    </div>
  )
})
