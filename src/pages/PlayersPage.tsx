import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import { PlayerCard } from '@/components/PlayerCard/PlayerCard'
import { PlayerCardForm } from '@/components/PlayerCard/PlayerCardForm'
import { PlayerDetailModal } from '@/components/PlayerCard/PlayerDetailModal'
import { getRepository } from '@/data'
import { withRatings } from '@/lib/ratings'
import { ALL_POSITIONS, POSITION_LABELS } from '@/types/player'
import type { CreatePlayerInput, Player, Position } from '@/types/player'

interface PlayersPageProps {
  onGoToSetup: () => void
  onGoToHistory: () => void
}

export function PlayersPage({ onGoToSetup, onGoToHistory }: PlayersPageProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const list = await getRepository().list()
      setPlayers(list)
      setError(null)
    } catch {
      setError('Oyuncular yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    return players
      .filter((p) => (filterPos === 'ALL' ? true : p.positions.includes(filterPos)))
      .filter((p) => {
        const term = search.trim().toLowerCase()
        if (!term) return true
        return p.name.toLowerCase().includes(term) || (p.nickname ?? '').toLowerCase().includes(term)
      })
      .map(withRatings)
  }, [players, search, filterPos])

  async function handleCreate(input: CreatePlayerInput) {
    await getRepository().create(input)
    setShowCreate(false)
    await refresh()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Halı Saha Takım Dengeleyici</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold text-sm sm:text-base"
          >
            + Yeni Kart
          </button>
          <button
            onClick={onGoToSetup}
            disabled={players.length < 2}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold text-sm sm:text-base disabled:opacity-40"
          >
            Maç Kur →
          </button>
          <button onClick={onGoToHistory} className="px-4 py-2 rounded-lg bg-white/10 text-slate-200 font-semibold text-sm sm:text-base">
            📊 Maç Geçmişi
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Oyuncu ara…"
          className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterPos('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap ${filterPos === 'ALL' ? 'bg-cyan-500 border-cyan-400 text-slate-900' : 'bg-white/5 border-white/15 text-slate-300'}`}
          >
            Tümü
          </button>
          {ALL_POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setFilterPos(pos)}
              className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap ${filterPos === pos ? 'bg-cyan-500 border-cyan-400 text-slate-900' : 'bg-white/5 border-white/15 text-slate-300'}`}
            >
              {POSITION_LABELS[pos]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400">
          {players.length === 0 ? 'Henüz kart oluşturulmadı. İlk kartı sen oluştur!' : 'Aramanla eşleşen oyuncu yok.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} size="sm" onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} wide>
          <PlayerCardForm submitLabel="Kartı Oluştur" onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {selected && (
        <PlayerDetailModal player={selected} onClose={() => setSelected(null)} onChanged={refresh} />
      )}
    </div>
  )
}
