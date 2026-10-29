import type { Orientation } from './formationLayout'

const LINE = { stroke: 'rgba(255,255,255,0.55)', strokeWidth: 0.6, fill: 'none' } as const

export function PitchMarkings({ orientation }: { orientation: Orientation }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      {orientation === 'horizontal' ? (
        <>
          <rect x={2} y={4} width={96} height={92} {...LINE} />
          <line x1={50} y1={4} x2={50} y2={96} {...LINE} />
          <circle cx={50} cy={50} r={9} {...LINE} />
          <circle cx={50} cy={50} r={0.7} fill="rgba(255,255,255,0.55)" />
          <rect x={2} y={28} width={13} height={44} {...LINE} />
          <rect x={85} y={28} width={13} height={44} {...LINE} />
          <rect x={-1} y={42} width={3} height={16} {...LINE} />
          <rect x={98} y={42} width={3} height={16} {...LINE} />
        </>
      ) : (
        <>
          <rect x={4} y={2} width={92} height={96} {...LINE} />
          <line x1={4} y1={50} x2={96} y2={50} {...LINE} />
          <circle cx={50} cy={50} r={9} {...LINE} />
          <circle cx={50} cy={50} r={0.7} fill="rgba(255,255,255,0.55)" />
          <rect x={28} y={2} width={44} height={13} {...LINE} />
          <rect x={28} y={85} width={44} height={13} {...LINE} />
          <rect x={42} y={-1} width={16} height={3} {...LINE} />
          <rect x={42} y={98} width={16} height={3} {...LINE} />
        </>
      )}
    </svg>
  )
}
