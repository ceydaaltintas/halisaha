import type { TeamResult } from '@/lib/balancer'
import { POSITION_LABELS } from '@/types/player'
import type { Position } from '@/types/player'
import { RadarChart } from './RadarChart'

const SECTIONS: Position[] = ['KL', 'DEF', 'OS', 'FOR']
const STAT_LABELS = ['HIZ', 'ŞUT', 'PAS', 'DRİ', 'DEF', 'FİZ'] as const
const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const

export function TeamComparisonPanel({
  teamA,
  teamB,
  nameA,
  nameB,
  colorA,
  colorB,
}: {
  teamA: TeamResult
  teamB: TeamResult
  nameA: string
  nameB: string
  colorA: string
  colorB: string
}) {
  const maxSection = Math.max(...SECTIONS.map((s) => Math.max(teamA.sectionRatings[s], teamB.sectionRatings[s])), 1)
  const avgOvrA = Math.round(teamA.totalRating / Math.max(teamA.slots.length, 1))
  const avgOvrB = Math.round(teamB.totalRating / Math.max(teamB.slots.length, 1))

  const radarSeriesA = STAT_KEYS.map((k) => teamA.statTotals[k] / Math.max(teamA.slots.length, 1))
  const radarSeriesB = STAT_KEYS.map((k) => teamB.statTotals[k] / Math.max(teamB.slots.length, 1))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 rounded-2xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between text-sm font-semibold">
          <span style={{ color: colorA }}>{nameA}</span>
          <span style={{ color: colorB }}>{nameB}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>
            Toplam {teamA.totalRating} · Ort. OVR {avgOvrA}
          </span>
          <span>
            Toplam {teamB.totalRating} · Ort. OVR {avgOvrB}
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {SECTIONS.map((s) => (
            <div key={s} className="flex items-center gap-2 text-xs text-slate-300">
              <div className="flex-1 flex justify-end">
                <div
                  className="h-3 rounded-l"
                  style={{ width: `${(teamA.sectionRatings[s] / maxSection) * 100}%`, background: colorA }}
                />
              </div>
              <span className="w-10 text-center shrink-0">{POSITION_LABELS[s].slice(0, 3)}</span>
              <div className="flex-1">
                <div
                  className="h-3 rounded-r"
                  style={{ width: `${(teamB.sectionRatings[s] / maxSection) * 100}%`, background: colorB }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <RadarChart labels={[...STAT_LABELS]} seriesA={radarSeriesA} seriesB={radarSeriesB} colorA={colorA} colorB={colorB} />
      </div>
    </div>
  )
}
