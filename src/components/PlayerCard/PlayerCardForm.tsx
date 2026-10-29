import { useMemo, useState } from 'react'
import { getRepository } from '@/data'
import { APP_CONFIG } from '@/lib/config'
import { calculateOvr, isWithinBudget, statBudgetTotal, tierForOvr } from '@/lib/ratings'
import { ALL_POSITIONS, POSITION_LABELS } from '@/types/player'
import type { AvatarType, CreatePlayerInput, Player, PlayerStats, Position } from '@/types/player'
import { PlayerCard } from './PlayerCard'

const EMOJI_OPTIONS = ['⚽', '🔥', '🐐', '🦁', '🐯', '🚀', '⭐', '🥅', '🛡️', '👑']

interface PlayerCardFormProps {
  initialPlayer?: Player
  requirePin?: boolean
  submitLabel: string
  onSubmit: (input: CreatePlayerInput) => Promise<void>
  onCancel?: () => void
}

function defaultStats(): PlayerStats {
  return { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50, goalkeeping: 50 }
}

export function PlayerCardForm({ initialPlayer, submitLabel, onSubmit, onCancel }: PlayerCardFormProps) {
  const [name, setName] = useState(initialPlayer?.name ?? '')
  const [nickname, setNickname] = useState(initialPlayer?.nickname ?? '')
  const [positions, setPositions] = useState<Position[]>(initialPlayer?.positions ?? ['OS'])
  const [mainPosition, setMainPosition] = useState<Position>(initialPlayer?.mainPosition ?? 'OS')
  const [stats, setStats] = useState<PlayerStats>(initialPlayer?.stats ?? defaultStats())
  const [avatarType, setAvatarType] = useState<AvatarType>(initialPlayer?.avatarType ?? 'initial')
  const [avatarValue, setAvatarValue] = useState(initialPlayer?.avatarValue ?? '')
  const [photoUrl, setPhotoUrl] = useState(initialPlayer?.photoUrl)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canBeGk = positions.includes('KL')
  const budgetUsed = statBudgetTotal(stats)
  const withinBudget = isWithinBudget(stats)
  const previewOvr = useMemo(() => calculateOvr({ stats, mainPosition }), [stats, mainPosition])
  const previewTier = tierForOvr(previewOvr)

  const previewPlayer = {
    id: initialPlayer?.id ?? 'preview',
    name: name || 'Oyuncu',
    nickname,
    positions,
    mainPosition,
    stats,
    avatarType,
    avatarValue,
    photoUrl,
    createdAt: initialPlayer?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ovr: previewOvr,
    positionRatings: { KL: 0, DEF: 0, OS: 0, FOR: 0 },
    tier: previewTier,
  }

  function togglePosition(pos: Position) {
    setPositions((prev) => {
      const next = prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
      if (next.length === 0) return prev
      if (!next.includes(mainPosition)) setMainPosition(next[0])
      return next
    })
  }

  function updateStat(key: keyof PlayerStats, value: number) {
    setStats((prev) => ({ ...prev, [key]: value }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await getRepository().uploadPhoto(file)
      setPhotoUrl(url)
      setAvatarType('photo')
    } catch {
      setError('Fotoğraf yüklenemedi.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('İsim gerekli.')
      return
    }
    if (!withinBudget) {
      setError(`Stat toplamı (${budgetUsed}) bütçeyi (${APP_CONFIG.statBudget}) aşıyor.`)
      return
    }
    if (!/^\d{4}$/.test(pin) && !initialPlayer) {
      setError('4 haneli bir PIN belirleyin.')
      return
    }

    const input: CreatePlayerInput = {
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      positions,
      mainPosition,
      stats: canBeGk ? stats : { ...stats, goalkeeping: undefined },
      avatarType,
      avatarValue,
      photoUrl,
      pin,
    }

    setSubmitting(true)
    try {
      await onSubmit(input)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="flex justify-center w-full lg:w-auto lg:sticky lg:top-4">
        <PlayerCard player={previewPlayer} size="lg" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 w-full flex flex-col gap-4 text-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            İsim
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Ör. Ahmet Yılmaz"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Takma ad (opsiyonel)
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Ör. Ahmet Çita"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Oynayabildiği pozisyonlar</span>
          <div className="flex gap-2 flex-wrap">
            {ALL_POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => togglePosition(pos)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  positions.includes(pos)
                    ? 'bg-cyan-500 border-cyan-400 text-slate-900 font-semibold'
                    : 'bg-white/5 border-white/15 text-slate-300'
                }`}
              >
                {POSITION_LABELS[pos]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm max-w-xs">
          Ana pozisyon
          <select
            value={mainPosition}
            onChange={(e) => setMainPosition(e.target.value as Position)}
            className="rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {POSITION_LABELS[pos]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Stat bütçesi</span>
            <span className={withinBudget ? 'text-emerald-400' : 'text-rose-400'}>
              {budgetUsed} / {APP_CONFIG.statBudget}
            </span>
          </div>
          {(
            [
              ['pace', 'HIZ'],
              ['shooting', 'ŞUT'],
              ['passing', 'PAS'],
              ['dribbling', 'DRİ'],
              ['defending', 'DEF'],
              ['physical', 'FİZ'],
            ] as [keyof PlayerStats, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0">{label}</span>
              <input
                type="range"
                min={APP_CONFIG.minStat}
                max={APP_CONFIG.maxStat}
                value={stats[key] ?? 0}
                onChange={(e) => updateStat(key, Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-8 text-right tabular-nums">{stats[key]}</span>
            </label>
          ))}

          {canBeGk && (
            <label className="flex items-center gap-3 text-sm pt-2 border-t border-white/10">
              <span className="w-10 shrink-0">KAL</span>
              <input
                type="range"
                min={APP_CONFIG.minStat}
                max={APP_CONFIG.goalkeepingMax}
                value={stats.goalkeeping ?? 50}
                onChange={(e) => updateStat('goalkeeping', Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-8 text-right tabular-nums">{stats.goalkeeping}</span>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Avatar</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setAvatarType('initial')
                setAvatarValue(name[0] ?? '')
              }}
              className={`px-3 py-1.5 rounded-full text-sm border ${avatarType === 'initial' ? 'bg-cyan-500 border-cyan-400 text-slate-900' : 'bg-white/5 border-white/15'}`}
            >
              Baş harf
            </button>
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setAvatarType('emoji')
                  setAvatarValue(emoji)
                }}
                className={`w-9 h-9 rounded-full text-lg border flex items-center justify-center ${
                  avatarType === 'emoji' && avatarValue === emoji ? 'bg-cyan-500 border-cyan-400' : 'bg-white/5 border-white/15'
                }`}
              >
                {emoji}
              </button>
            ))}
            <label className="px-3 py-1.5 rounded-full text-sm border bg-white/5 border-white/15 cursor-pointer">
              Fotoğraf yükle
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm max-w-xs">
          {initialPlayer ? 'PIN (düzenlemek için gerekli)' : `${APP_CONFIG.pinLength} haneli PIN belirle`}
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, APP_CONFIG.pinLength))}
            inputMode="numeric"
            className="rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400 tracking-widest"
            placeholder="••••"
          />
        </label>

        {error && <p className="text-rose-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !withinBudget}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Kaydediliyor…' : submitLabel}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-lg bg-white/10 text-slate-200">
              Vazgeç
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
