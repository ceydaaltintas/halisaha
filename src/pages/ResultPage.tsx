import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { RecordMatchModal } from '@/components/Match/RecordMatchModal'
import { Pitch } from '@/components/Pitch/Pitch'
import { TeamComparisonPanel } from '@/components/Pitch/TeamComparisonPanel'
import { PlayerCard } from '@/components/PlayerCard/PlayerCard'
import { getMatchRepository } from '@/data'
import { applySwap, type BalanceAlternative } from '@/lib/balancer'
import { computeFormAdjustments } from '@/lib/form'
import { runBalancerInWorker } from '@/lib/runBalancer'
import { withRatings } from '@/lib/ratings'
import type { MatchSetup } from './MatchSetupPage'

interface ResultPageProps {
  setup: MatchSetup
  onBack: () => void
}

const TEAM_COLORS = {
  Kırmızı: '#ef4444',
  Mavi: '#3b82f6',
  Yeşil: '#22c55e',
  Sarı: '#eab308',
}

export function ResultPage({ setup, onBack }: ResultPageProps) {
  const [loading, setLoading] = useState(true)
  const [alternatives, setAlternatives] = useState<BalanceAlternative[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [altIndex, setAltIndex] = useState(0)
  const [seed, setSeed] = useState<number>(() => Date.now() & 0xffffffff)
  const [nameA, setNameA] = useState('Kırmızı')
  const [nameB, setNameB] = useState('Mavi')
  const [colorA, setColorA] = useState(TEAM_COLORS.Kırmızı)
  const [colorB, setColorB] = useState(TEAM_COLORS.Mavi)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [swapMode, setSwapMode] = useState(false)
  const [swapFirst, setSwapFirst] = useState<string | null>(null)
  const [override, setOverride] = useState<{ teamA: BalanceAlternative['teamA']; teamB: BalanceAlternative['teamB'] } | null>(null)
  const [formAdjustments, setFormAdjustments] = useState<Record<string, number>>({})
  const [showRecordMatch, setShowRecordMatch] = useState(false)
  const pitchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const playerIds = setup.players.map((p) => p.id)
    getMatchRepository()
      .listDetailsForPlayers(playerIds)
      .then((details) => {
        if (!cancelled) setFormAdjustments(computeFormAdjustments(playerIds, details))
      })
      .catch(() => {
        if (!cancelled) setFormAdjustments({})
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setOverride(null)
    runBalancerInWorker({ ...setup, seed, formAdjustments })
      .then((result) => {
        if (cancelled) return
        setAlternatives(result.alternatives)
        setWarnings(result.warnings)
        setAltIndex(0)
      })
      .catch(() => {
        if (!cancelled) setWarnings(['Takımlar oluşturulurken bir hata oluştu.'])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, formAdjustments])

  const current = alternatives[altIndex]
  const teamA = override?.teamA ?? current?.teamA
  const teamB = override?.teamB ?? current?.teamB

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId || !teamA || !teamB) return null
    const slot = [...teamA.slots, ...teamB.slots].find((s) => s.player.id === selectedPlayerId)
    return slot ? withRatings(slot.player) : null
  }, [selectedPlayerId, teamA, teamB])

  function handleReshuffle() {
    if (altIndex < alternatives.length - 1) {
      setAltIndex((i) => i + 1)
      setOverride(null)
    } else {
      setSeed(Date.now() & 0xffffffff)
    }
  }

  function handleChipClick(playerId: string) {
    if (!swapMode) {
      setSelectedPlayerId(playerId)
      return
    }
    if (!swapFirst) {
      setSwapFirst(playerId)
      return
    }
    if (swapFirst === playerId) {
      setSwapFirst(null)
      return
    }
    if (teamA && teamB) {
      const result = applySwap(teamA, teamB, swapFirst, playerId, formAdjustments)
      setOverride(result)
    }
    setSwapFirst(null)
  }

  async function handleShareImage() {
    if (!pitchRef.current) return
    const dataUrl = await toPng(pitchRef.current, { pixelRatio: 2 })
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'halisaha-dizilis.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Halı Saha Dizilişi' })
          return
        }
      } catch {
        // kullanıcı paylaşımı iptal etti veya desteklenmiyor, indirmeye düş
      }
    }
    const link = document.createElement('a')
    link.download = 'halisaha-dizilis.png'
    link.href = dataUrl
    link.click()
  }

  function buildShareLink(): string {
    const payload = {
      seed: current?.seed ?? seed,
      teamSize: setup.teamSize,
      formation: setup.formation.id,
      players: setup.players.map((p) => p.id),
    }
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)))
    const url = new URL(window.location.href)
    url.search = `?share=${encoded}`
    return url.toString()
  }

  const [shareLink, setShareLink] = useState<string | null>(null)

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-300">Takımlar hesaplanıyor…</div>
  }

  if (!current || !teamA || !teamB) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-300 flex flex-col gap-4">
        <p>Takımlar oluşturulamadı.</p>
        {warnings.map((w) => (
          <p key={w} className="text-amber-400 text-sm">
            {w}
          </p>
        ))}
        <button onClick={onBack} className="self-center px-4 py-2 rounded-lg bg-white/10 text-slate-100">
          Geri dön
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-300 hover:text-white">
          ← Kurulumu değiştir
        </button>
        <h2 className="text-xl font-bold text-white">Takımlar</h2>
      </div>

      {warnings.map((w) => (
        <p key={w} className="text-amber-400 text-sm">
          {w}
        </p>
      ))}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white/5 rounded-xl p-3">
        <div className="flex gap-3 flex-wrap">
          <TeamNameInput label="Takım A adı" value={nameA} onChange={setNameA} color={colorA} onColorChange={setColorA} />
          <TeamNameInput label="Takım B adı" value={nameB} onChange={setNameB} color={colorB} onColorChange={setColorB} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleReshuffle} className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold text-sm">
            🔀 Yeniden karıştır ({altIndex + 1}/{alternatives.length})
          </button>
          <button
            onClick={() => {
              setSwapMode((s) => !s)
              setSwapFirst(null)
            }}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${swapMode ? 'bg-amber-500 text-slate-900' : 'bg-white/10 text-slate-200'}`}
          >
            {swapMode ? 'Takas modu açık (iki oyuncuya dokun)' : 'Manuel takas'}
          </button>
          <button onClick={handleShareImage} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200 text-sm">
            📷 Paylaş
          </button>
          <button onClick={() => setShareLink(buildShareLink())} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200 text-sm">
            🔗 Link al
          </button>
          <button onClick={() => setShowRecordMatch(true)} className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold text-sm">
            📝 Maç Sonucunu Kaydet
          </button>
        </div>
      </div>

      <Pitch ref={pitchRef} formation={setup.formation} teamA={teamA} teamB={teamB} colorA={colorA} colorB={colorB} selectedPlayerId={swapFirst} onPlayerClick={handleChipClick} />

      <TeamComparisonPanel teamA={teamA} teamB={teamB} nameA={nameA} nameB={nameB} colorA={colorA} colorB={colorB} />

      {selectedPlayer && (
        <Modal onClose={() => setSelectedPlayerId(null)}>
          <div className="flex justify-center">
            <PlayerCard player={selectedPlayer} size="lg" />
          </div>
        </Modal>
      )}

      {showRecordMatch && (
        <RecordMatchModal
          teamSize={setup.teamSize}
          teamA={teamA}
          teamB={teamB}
          nameA={nameA}
          nameB={nameB}
          onClose={() => setShowRecordMatch(false)}
        />
      )}

      {shareLink && (
        <Modal onClose={() => setShareLink(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-slate-200 text-sm">Bu linki paylaşarak aynı diziliş seed'ini tekrar oluşturabilirsiniz:</p>
            <input readOnly value={shareLink} className="rounded-lg bg-white/10 px-3 py-2 text-slate-100 text-xs" onFocus={(e) => e.target.select()} />
            <button
              onClick={() => navigator.clipboard?.writeText(shareLink)}
              className="self-start px-3 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold text-sm"
            >
              Kopyala
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TeamNameInput({
  label,
  value,
  onChange,
  color,
  onColorChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  color: string
  onColorChange: (c: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent" title={label} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-lg bg-white/10 px-2 py-1.5 text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400"
      />
    </label>
  )
}
