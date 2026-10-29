import { useEffect, useMemo, useState } from 'react'
import { getMatchRepository, getRepository } from '@/data'
import { computeCareerStats } from '@/lib/form'
import type { MatchDetails, MatchResult } from '@/types/match'
import type { Player } from '@/types/player'

interface MatchHistoryPageProps {
  onBack: () => void
}

export function MatchHistoryPage({ onBack }: MatchHistoryPageProps) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [details, setDetails] = useState<MatchDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [allPlayers, matchList] = await Promise.all([getRepository().list(), getMatchRepository().listMatches()])
      setPlayers(allPlayers)
      setMatches(matchList)
      const allDetails = await getMatchRepository().listDetailsForPlayers(allPlayers.map((p) => p.id))
      setDetails(allDetails)
      setLoading(false)
    }
    load()
  }, [])

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? '—'

  const leaderboard = useMemo(() => {
    return players
      .map((p) => ({ player: p, stats: computeCareerStats(p.id, details) }))
      .filter((row) => row.stats.matchesPlayed > 0)
      .sort((a, b) => b.stats.winRate - a.stats.winRate || b.stats.totalGoals - a.stats.totalGoals)
  }, [players, details])

  const detailsByMatchId = useMemo(() => {
    const map = new Map<string, MatchDetails>()
    for (const d of details) map.set(d.match.id, d)
    return map
  }, [details])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-300 hover:text-white">
          ← Geri
        </button>
        <h2 className="text-xl font-bold text-white">Maç Geçmişi & İstatistikler</h2>
      </div>

      {loading ? (
        <p className="text-slate-400">Yükleniyor…</p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="text-slate-200 font-semibold">Lider Tablosu</h3>
            {leaderboard.length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz kayıtlı maç yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-200">
                  <thead>
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="py-1 pr-3">Oyuncu</th>
                      <th className="py-1 pr-3 text-center">Maç</th>
                      <th className="py-1 pr-3 text-center">G</th>
                      <th className="py-1 pr-3 text-center">Gal.%</th>
                      <th className="py-1 pr-3 text-center">Gol</th>
                      <th className="py-1 pr-3 text-center">Asist</th>
                      <th className="py-1 pr-3 text-center">Ort. Puan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map(({ player, stats }) => (
                      <tr key={player.id} className="border-t border-white/5">
                        <td className="py-1.5 pr-3">{player.nickname || player.name}</td>
                        <td className="py-1.5 pr-3 text-center">{stats.matchesPlayed}</td>
                        <td className="py-1.5 pr-3 text-center">{stats.wins}</td>
                        <td className="py-1.5 pr-3 text-center">{Math.round(stats.winRate * 100)}%</td>
                        <td className="py-1.5 pr-3 text-center">{stats.totalGoals}</td>
                        <td className="py-1.5 pr-3 text-center">{stats.totalAssists}</td>
                        <td className="py-1.5 pr-3 text-center">{stats.averageRating?.toFixed(1) ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-slate-200 font-semibold">Geçmiş Maçlar</h3>
            {matches.length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz kayıtlı maç yok.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {matches.map((m) => {
                  const detail = detailsByMatchId.get(m.id)
                  const expanded = expandedMatchId === m.id
                  return (
                    <li key={m.id} className="bg-white/5 rounded-xl p-3">
                      <button
                        onClick={() => setExpandedMatchId(expanded ? null : m.id)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <span className="text-sm text-slate-400">{m.date}</span>
                        <span className="font-semibold">
                          {m.teamAName} {m.teamAScore} - {m.teamBScore} {m.teamBName}
                        </span>
                        <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
                      </button>
                      {expanded && detail && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {(['A', 'B'] as const).map((team) => (
                            <div key={team} className="flex flex-col gap-1">
                              <span className="text-slate-400 text-xs">{team === 'A' ? m.teamAName : m.teamBName}</span>
                              {detail.playerStats
                                .filter((s) => s.team === team)
                                .map((s) => (
                                  <div key={s.playerId} className="flex justify-between text-slate-300">
                                    <span>{playerName(s.playerId)}</span>
                                    <span className="text-slate-500">
                                      {s.goals} gol · {s.assists} asist
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
