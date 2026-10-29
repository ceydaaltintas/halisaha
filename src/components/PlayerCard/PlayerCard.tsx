import { useRef, useState } from 'react'
import type { PlayerWithRatings } from '@/types/player'
import { POSITION_LABELS } from '@/types/player'
import { Avatar } from './Avatar'
import { FIELD_STAT_ITEMS, GK_STAT_ITEMS, TIER_THEME } from './cardTheme'

interface PlayerCardProps {
  player: PlayerWithRatings
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  selected?: boolean
}

const SIZE_MAP = {
  sm: { width: 128, height: 179 },
  md: { width: 200, height: 280 },
  lg: { width: 260, height: 364 },
}

export function PlayerCard({ player, size = 'md', onClick, selected }: PlayerCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const theme = TIER_THEME[player.tier]
  const isGk = player.mainPosition === 'KL'
  const statItems = isGk ? GK_STAT_ITEMS : FIELD_STAT_ITEMS
  const dims = SIZE_MAP[size]

  function handleMove(e: React.PointerEvent<HTMLButtonElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({ rx: (py - 0.5) * -14, ry: (px - 0.5) * 14 })
  }

  function handleLeave() {
    setTilt({ rx: 0, ry: 0 })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="relative select-none text-left rounded-2xl overflow-hidden transition-transform duration-150 ease-out flex flex-col"
      style={{
        width: dims.width,
        height: dims.height,
        background: theme.bg,
        border: `2px solid ${selected ? '#22d3ee' : theme.border}`,
        color: theme.text,
        boxShadow: selected ? '0 0 0 3px rgba(34,211,238,0.5)' : theme.glow ?? '0 6px 16px rgba(0,0,0,0.35)',
        transform: `perspective(600px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.rx || tilt.ry ? 1.03 : 1})`,
      }}
    >
      <div className="flex items-start justify-between px-3 pt-2 shrink-0">
        <div className="flex flex-col items-center leading-none">
          <span style={{ fontSize: dims.width * 0.19 }} className="font-extrabold">
            {player.ovr}
          </span>
          <span style={{ fontSize: dims.width * 0.085 }} className="font-semibold opacity-90">
            {player.mainPosition}
          </span>
        </div>

        <span className="opacity-80 text-right" style={{ fontSize: dims.width * 0.06 }}>
          {TIER_THEME[player.tier].label}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 px-2">
        <Avatar player={player} size={dims.width * 0.34} />
        <div
          className="font-bold truncate px-2 text-center"
          style={{ fontSize: dims.width * 0.09, maxWidth: dims.width * 0.9 }}
          title={player.nickname || player.name}
        >
          {(player.nickname || player.name).toUpperCase()}
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-4 pb-3 shrink-0"
        style={{ fontSize: dims.width * 0.075 }}
      >
        {statItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="font-bold">{player.stats[item.key as keyof typeof player.stats] ?? '-'}</span>
            <span className="opacity-80">{item.label}</span>
          </div>
        ))}
      </div>

      <span className="sr-only">{POSITION_LABELS[player.mainPosition]}</span>
    </button>
  )
}
