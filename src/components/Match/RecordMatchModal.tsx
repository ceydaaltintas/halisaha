import { Fragment, useState } from 'react'
import { Modal } from '@/components/Modal'
import { getMatchRepository } from '@/data'
import type { TeamResult } from '@/lib/balancer'
import type { TeamSize } from '@/lib/formations'
import type { MatchResult } from '@/types/match'

interface RecordMatchModalProps {
  teamSize: TeamSize
  teamA: TeamResult
  teamB: TeamResult
  nameA: string
  nameB: string
  onClose: () => void
}

interface PlayerRow {
  playerId: string
  name: string
  goals: number
  assists: number
}

export function RecordMatchModal({ teamSize, teamA, teamB, nameA, nameB, onClose }: RecordMatchModalProps) {
  const [step, setStep] = useState<'stats' | 'rate' | 'done'>('stats')
  const [teamAScore, setTeamAScore] = useState(0)
  const [teamBScore, setTeamBScore] = useState(0)
  const [rowsA, setRowsA] = useState<PlayerRow[]>(
    teamA.slots.map((s) => ({ playerId: s.player.id, name: s.player.nickname || s.player.name, goals: 0, assists: 0 })),
  )
  const [rowsB, setRowsB] = useState<PlayerRow[]>(
    teamB.slots.map((s) => ({ playerId: s.player.id, name: s.player.nickname || s.player.name, goals: 0, assists: 0 })),
  )
  const [savedMatch, setSavedMatch] = useState<MatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const allParticipants = [...rowsA.map((r) => ({ ...r, team: 'A' as const })), ...rowsB.map((r) => ({ ...r, team: 'B' as const }))]

  function updateRow(team: 'A' | 'B', playerId: string, field: 'goals' | 'assists', value: number) {
    const setter = team === 'A' ? setRowsA : setRowsB
    setter((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, [field]: Math.max(0, value) } : r)))
  }

  async function handleSaveStats() {
    setError(null)
    setSaving(true)
    try {
      const match = await getMatchRepository().createMatch({
        date: new Date().toISOString().slice(0, 10),
        teamSize,
        teamAName: nameA,
        teamBName: nameB,
        teamAScore,
        teamBScore,
        playerStats: allParticipants.map((p) => ({ playerId: p.playerId, team: p.team, goals: p.goals, assists: p.assists })),
      })
      setSavedMatch(match)
      setStep('rate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Maç kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} wide>
      {step === 'stats' && (
        <div className="flex flex-col gap-4 text-slate-100">
          <h3 className="text-lg font-bold">Maç Sonucunu Kaydet</h3>
          <div className="flex items-center justify-center gap-4 text-xl font-bold">
            <span>{nameA}</span>
            <input
              type="number"
              min={0}
              value={teamAScore}
              onChange={(e) => setTeamAScore(Math.max(0, Number(e.target.value)))}
              className="w-16 text-center rounded-lg bg-white/10 py-1"
            />
            <span>-</span>
            <input
              type="number"
              min={0}
              value={teamBScore}
              onChange={(e) => setTeamBScore(Math.max(0, Number(e.target.value)))}
              className="w-16 text-center rounded-lg bg-white/10 py-1"
            />
            <span>{nameB}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PlayerStatsTable title={nameA} rows={rowsA} onChange={(id, field, value) => updateRow('A', id, field, value)} />
            <PlayerStatsTable title={nameB} rows={rowsB} onChange={(id, field, value) => updateRow('B', id, field, value)} />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            onClick={handleSaveStats}
            disabled={saving}
            className="self-start px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-900 font-semibold disabled:opacity-40"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet ve puanlamaya geç'}
          </button>
        </div>
      )}

      {step === 'rate' && savedMatch && (
        <RatingStep matchId={savedMatch.id} participants={allParticipants} onDone={() => setStep('done')} />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-emerald-400 font-semibold">Maç kaydedildi!</p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-slate-100">
            Kapat
          </button>
        </div>
      )}
    </Modal>
  )
}

function PlayerStatsTable({
  title,
  rows,
  onChange,
}: {
  title: string
  rows: PlayerRow[]
  onChange: (playerId: string, field: 'goals' | 'assists', value: number) => void
}) {
  return (
    <div className="flex flex-col gap-2 bg-white/5 rounded-xl p-3">
      <h4 className="font-semibold text-sm text-slate-300">{title}</h4>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-sm items-center">
        <span className="text-slate-500 text-xs">Oyuncu</span>
        <span className="text-slate-500 text-xs text-center">Gol</span>
        <span className="text-slate-500 text-xs text-center">Asist</span>
        {rows.map((r) => (
          <Fragment key={r.playerId}>
            <span className="truncate">{r.name}</span>
            <input
              type="number"
              min={0}
              value={r.goals}
              onChange={(e) => onChange(r.playerId, 'goals', Number(e.target.value))}
              className="w-12 text-center rounded bg-white/10"
            />
            <input
              type="number"
              min={0}
              value={r.assists}
              onChange={(e) => onChange(r.playerId, 'assists', Number(e.target.value))}
              className="w-12 text-center rounded bg-white/10"
            />
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function RatingStep({
  matchId,
  participants,
  onDone,
}: {
  matchId: string
  participants: { playerId: string; name: string; team: 'A' | 'B' }[]
  onDone: () => void
}) {
  const [raterId, setRaterId] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const others = participants.filter((p) => p.playerId !== raterId)

  async function handleSubmit() {
    setError(null)
    if (!raterId) {
      setError('Önce kendini seç.')
      return
    }
    setSubmitting(true)
    try {
      const repo = getMatchRepository()
      await Promise.all(
        Object.entries(scores)
          .filter(([, score]) => score > 0)
          .map(([ratedId, score]) => repo.submitRating(matchId, raterId, ratedId, score)),
      )
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Puanlar kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      <h3 className="text-lg font-bold">Performans Puanla (opsiyonel)</h3>
      <label className="flex flex-col gap-1 text-sm max-w-xs">
        Sen kimsin?
        <select
          value={raterId}
          onChange={(e) => setRaterId(e.target.value)}
          className="rounded-lg bg-white/10 px-3 py-2 outline-none"
        >
          <option value="">Seç…</option>
          {participants.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {raterId && (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {others.map((p) => (
            <label key={p.playerId} className="flex items-center gap-3 text-sm">
              <span className="w-28 truncate">{p.name}</span>
              <input
                type="range"
                min={0}
                max={10}
                value={scores[p.playerId] ?? 0}
                onChange={(e) => setScores((prev) => ({ ...prev, [p.playerId]: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="w-8 text-right tabular-nums">{(scores[p.playerId] ?? 0) || '-'}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !raterId}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-900 font-semibold disabled:opacity-40"
        >
          {submitting ? 'Kaydediliyor…' : 'Puanları Kaydet'}
        </button>
        <button onClick={onDone} className="px-5 py-2.5 rounded-lg bg-white/10 text-slate-200">
          Atla
        </button>
      </div>
    </div>
  )
}
