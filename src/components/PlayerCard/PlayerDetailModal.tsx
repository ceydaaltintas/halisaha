import { useState } from 'react'
import { getRepository } from '@/data'
import { withRatings } from '@/lib/ratings'
import type { CreatePlayerInput, Player } from '@/types/player'
import { Modal } from '../Modal'
import { PlayerCard } from './PlayerCard'
import { PlayerCardForm } from './PlayerCardForm'

export function PlayerDetailModal({
  player,
  onClose,
  onChanged,
}: {
  player: Player
  onClose: () => void
  onChanged: () => void
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleUpdate(input: CreatePlayerInput) {
    await getRepository().update(player.id, { ...input, pin: input.pin })
    onChanged()
    onClose()
  }

  async function handleDelete() {
    setError(null)
    if (!/^\d{4}$/.test(pin)) {
      setError('4 haneli PIN girin.')
      return
    }
    setBusy(true)
    try {
      await getRepository().remove(player.id, pin)
      onChanged()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'edit') {
    return (
      <Modal onClose={onClose} wide>
        <PlayerCardForm initialPlayer={player} submitLabel="Güncelle" onSubmit={handleUpdate} onCancel={() => setMode('view')} />
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        <PlayerCard player={withRatings(player)} size="lg" />
        <div className="flex gap-3">
          <button onClick={() => setMode('edit')} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold">
            Düzenle
          </button>
          <button onClick={() => setMode('delete')} className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
            Sil
          </button>
        </div>

        {mode === 'delete' && (
          <div className="w-full flex flex-col gap-2 pt-2 border-t border-white/10">
            <label className="text-sm text-slate-300">
              PIN gir, kartı sil
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-rose-400 tracking-widest"
                placeholder="••••"
              />
            </label>
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <button
              onClick={handleDelete}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-rose-500 text-white font-semibold disabled:opacity-40"
            >
              {busy ? 'Siliniyor…' : 'Kalıcı olarak sil'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
