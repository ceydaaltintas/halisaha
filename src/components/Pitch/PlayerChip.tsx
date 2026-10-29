import type { SlotAssignment } from '@/lib/balancer'

export function PlayerChip({
  x,
  y,
  slot,
  color,
  selected,
  onClick,
}: {
  x: number
  y: number
  slot: SlotAssignment
  color: string
  selected?: boolean
  onClick?: () => void
}) {
  const label = slot.player.nickname || slot.player.name

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-sm shadow-lg border-2 transition-transform group-hover:scale-110"
        style={{
          background: color,
          borderColor: selected ? '#22d3ee' : slot.outOfPosition ? '#f87171' : 'rgba(255,255,255,0.85)',
          color: '#0b1210',
        }}
        title={slot.outOfPosition ? 'Bu pozisyonu işaretlemedi (cezalı atama)' : undefined}
      >
        {slot.rating}
      </div>
      <span className="text-[9px] sm:text-xs text-white font-semibold bg-black/60 rounded px-1 truncate max-w-[64px] sm:max-w-[84px]">
        {label}
      </span>
    </button>
  )
}
