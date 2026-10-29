import type { Player } from '@/types/player'

export function Avatar({ player, size = 72 }: { player: Pick<Player, 'avatarType' | 'avatarValue' | 'photoUrl' | 'name'>; size?: number }) {
  if (player.avatarType === 'photo' && player.photoUrl) {
    return (
      <img
        src={player.photoUrl}
        alt={player.name}
        className="rounded-full object-cover border-2 border-white/70 shadow-md"
        style={{ width: size, height: size }}
      />
    )
  }

  const content = player.avatarType === 'emoji' ? player.avatarValue : (player.avatarValue || player.name[0] || '?').toUpperCase()

  return (
    <div
      className="rounded-full bg-black/25 border-2 border-white/70 shadow-md flex items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {content}
    </div>
  )
}
