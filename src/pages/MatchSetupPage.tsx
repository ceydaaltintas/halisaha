import { useEffect, useMemo, useState } from 'react'
import { PlayerCard } from '@/components/PlayerCard/PlayerCard'
import { getRepository } from '@/data'
import type { Constraint, TeamId } from '@/lib/balancer'
import { FORMATIONS, type Formation, type TeamSize } from '@/lib/formations'
import { withRatings } from '@/lib/ratings'
import { POSITION_LABELS } from '@/types/player'
import type { Player } from '@/types/player'

export interface MatchSetup {
  players: Player[]
  teamSize: TeamSize
  formation: Formation
  constraints: Constraint[]
}

interface MatchSetupPageProps {
  onBack: () => void
  onStart: (setup: MatchSetup) => void
}

const TEAM_SIZES: TeamSize[] = [5, 6, 7, 8]

export function MatchSetupPage({ onBack, onStart }: MatchSetupPageProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [teamSize, setTeamSize] = useState<TeamSize>(5)
  const [formationId, setFormationId] = useState(FORMATIONS[5][0].id)
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [benchPlayerId, setBenchPlayerId] = useState<string | null>(null)

  useEffect(() => {
    getRepository()
      .list()
      .then(setPlayers)
      .catch(() => setPlayers([]))
  }, [])

  const formationOptions = FORMATIONS[teamSize]
  const formation = formationOptions.find((f) => f.id === formationId) ?? formationOptions[0]

  const selectedPlayers = useMemo(
    () => players.filter((p) => selectedIds.has(p.id) && p.id !== benchPlayerId),
    [players, selectedIds, benchPlayerId],
  )

  const expectedCount = teamSize * 2
  const rawSelectedCount = selectedIds.size
  const effectiveCount = selectedPlayers.length
  const diff = effectiveCount - expectedCount
  const isOdd = rawSelectedCount % 2 === 1

  function toggleTeamSize(size: TeamSize) {
    setTeamSize(size)
    setFormationId(FORMATIONS[size][0].id)
  }

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setBenchPlayerId(null)
  }

  function addConstraint(c: Constraint) {
    setConstraints((prev) => [...prev, c])
  }

  function removeConstraint(idx: number) {
    setConstraints((prev) => prev.filter((_, i) => i !== idx));
  }

  const selectedList = players.filter((p) => selectedIds.has(p.id))

  function constraintLabel(c: Constraint): string {
    const name = (id: string) => players.find((p) => p.id === id)?.name ?? id
    if (c.type === 'together') return `${name(c.playerIds[0])} + ${name(c.playerIds[1])} aynı takımda`
    if (c.type === 'apart') return `${name(c.playerIds[0])} + ${name(c.playerIds[1])} ayrı takımda`
    if (c.type === 'mustGoalkeeper') return `${name(c.playerIds[0])} kesin kaleci`
    return `${name(c.playerIds[0])} → Takım ${c.team}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="shrink-0 text-sm sm:text-base text-slate-300 hover:text-white">
          ← Kartlara dön
        </button>
        <h2 className="text-base sm:text-xl font-bold text-white text-right">Maç Kurulumu</h2>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-slate-200 font-semibold">1. Gelenleri seç ({rawSelectedCount} seçili)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 justify-items-center">
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              player={withRatings(p)}
              size="sm"
              selected={selectedIds.has(p.id)}
              onClick={() => togglePlayer(p.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-slate-200 font-semibold">2. Takım büyüklüğü</h3>
        <div className="flex gap-2">
          {TEAM_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggleTeamSize(size)}
              className={`px-4 py-2 rounded-lg border ${teamSize === size ? 'bg-cyan-500 border-cyan-400 text-slate-900 font-semibold' : 'bg-white/5 border-white/15 text-slate-300'}`}
            >
              {size}v{size}
            </button>
          ))}
        </div>

        {diff !== 0 && (
          <p className="text-amber-400 text-sm">
            {diff > 0
              ? `${diff} kişi fazla. ${expectedCount} oyuncu gerekiyor.`
              : `${Math.abs(diff)} kişi eksik. ${expectedCount} oyuncu gerekiyor.`}
          </p>
        )}

        {isOdd && (
          <div className="flex flex-col gap-2">
            <p className="text-amber-400 text-sm">Tek sayıda oyuncu seçildi. Birini yedek/rotasyon olarak dışarıda bırakabilirsin:</p>
            <select
              value={benchPlayerId ?? ''}
              onChange={(e) => setBenchPlayerId(e.target.value || null)}
              className="max-w-xs rounded-lg bg-white/10 px-3 py-2 text-slate-100 outline-none"
            >
              <option value="">— Kimse dışarıda bırakılmasın —</option>
              {selectedList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-slate-200 font-semibold">3. Diziliş</h3>
        <div className="flex gap-2 flex-wrap">
          {formationOptions.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormationId(f.id)}
              className={`px-4 py-2 rounded-lg border font-mono ${formation.id === f.id ? 'bg-cyan-500 border-cyan-400 text-slate-900 font-semibold' : 'bg-white/5 border-white/15 text-slate-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-slate-200 font-semibold">4. Kısıtlar (opsiyonel)</h3>
        <ConstraintBuilder players={selectedList} onAdd={addConstraint} />
        {constraints.length > 0 && (
          <ul className="flex flex-col gap-1">
            {constraints.map((c, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-1.5">
                <span className="text-slate-300">{constraintLabel(c)}</span>
                <button onClick={() => removeConstraint(idx)} className="text-rose-400 hover:text-rose-300">
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        disabled={effectiveCount !== expectedCount}
        onClick={() => onStart({ players: selectedPlayers, teamSize, formation, constraints })}
        className="self-start px-6 py-3 rounded-lg bg-emerald-500 text-slate-900 font-bold text-lg disabled:opacity-40"
      >
        Takımları Oluştur
      </button>
    </div>
  )
}

function ConstraintBuilder({ players, onAdd }: { players: Player[]; onAdd: (c: Constraint) => void }) {
  const [type, setType] = useState<Constraint['type']>('together')
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [team, setTeam] = useState<TeamId>('A')

  function handleAdd() {
    if (type === 'mustGoalkeeper' || type === 'lockedTeam') {
      if (!playerA) return
      onAdd({ type, playerIds: [playerA], team: type === 'lockedTeam' ? team : undefined })
    } else {
      if (!playerA || !playerB || playerA === playerB) return
      onAdd({ type, playerIds: [playerA, playerB] })
    }
    setPlayerA('')
    setPlayerB('')
  }

  const needsTwo = type === 'together' || type === 'apart'

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2 bg-white/5 rounded-lg p-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as Constraint['type'])}
        className="w-full sm:w-auto min-w-0 rounded-lg bg-white/10 px-3 py-2 text-slate-100"
      >
        <option value="together">Aynı takımda olsun</option>
        <option value="apart">Ayrı takımda olsun</option>
        <option value="mustGoalkeeper">Kesin kaleci olsun</option>
        <option value="lockedTeam">Takıma sabitle</option>
      </select>
      <select
        value={playerA}
        onChange={(e) => setPlayerA(e.target.value)}
        className="w-full sm:w-auto min-w-0 rounded-lg bg-white/10 px-3 py-2 text-slate-100"
      >
        <option value="">Oyuncu seç</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {needsTwo && (
        <select
          value={playerB}
          onChange={(e) => setPlayerB(e.target.value)}
          className="w-full sm:w-auto min-w-0 rounded-lg bg-white/10 px-3 py-2 text-slate-100"
        >
          <option value="">Oyuncu seç</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {type === 'lockedTeam' && (
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value as TeamId)}
          className="w-full sm:w-auto min-w-0 rounded-lg bg-white/10 px-3 py-2 text-slate-100"
        >
          <option value="A">Takım A</option>
          <option value="B">Takım B</option>
        </select>
      )}
      <button onClick={handleAdd} className="w-full sm:w-auto px-3 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold">
        Ekle
      </button>
      <span className="text-xs text-slate-500 w-full break-words">
        Pozisyonlar: {players.map((p) => `${p.name} (${POSITION_LABELS[p.mainPosition]})`).join(', ')}
      </span>
    </div>
  )
}
