import { useEffect, useState } from 'react'
import { getRepository } from '@/data'
import { FORMATIONS, type TeamSize } from '@/lib/formations'
import { MatchHistoryPage } from '@/pages/MatchHistoryPage'
import { MatchSetupPage, type MatchSetup } from '@/pages/MatchSetupPage'
import { PlayersPage } from '@/pages/PlayersPage'
import { ResultPage } from '@/pages/ResultPage'

type View = 'players' | 'setup' | 'result' | 'history'

interface SharePayload {
  seed: number
  teamSize: TeamSize
  formation: string
  players: string[]
}

function parseSharePayload(): SharePayload | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('share')
  if (!encoded) return null
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as SharePayload
  } catch {
    return null
  }
}

function App() {
  const [view, setView] = useState<View>('players')
  const [setup, setSetup] = useState<MatchSetup | null>(null)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    const payload = parseSharePayload()
    if (!payload) {
      setRestoring(false)
      return
    }
    getRepository()
      .list()
      .then((all) => {
        const players = all.filter((p) => payload.players.includes(p.id))
        const formation = FORMATIONS[payload.teamSize]?.find((f) => f.id === payload.formation)
        if (players.length === payload.teamSize * 2 && formation) {
          setSetup({ players, teamSize: payload.teamSize, formation, constraints: [] })
          setView('result')
        }
      })
      .finally(() => setRestoring(false))
  }, [])

  if (restoring) {
    return <div className="min-h-screen flex items-center justify-center text-slate-300">Yükleniyor…</div>
  }

  return (
    <div className="min-h-screen bg-[#0b1210]">
      {view === 'players' && <PlayersPage onGoToSetup={() => setView('setup')} onGoToHistory={() => setView('history')} />}
      {view === 'history' && <MatchHistoryPage onBack={() => setView('players')} />}
      {view === 'setup' && (
        <MatchSetupPage
          onBack={() => setView('players')}
          onStart={(s) => {
            setSetup(s)
            setView('result')
          }}
        />
      )}
      {view === 'result' && setup && <ResultPage setup={setup} onBack={() => setView('setup')} />}
    </div>
  )
}

export default App
