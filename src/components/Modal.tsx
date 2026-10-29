import type { ReactNode } from 'react'

export function Modal({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-6 w-full ${wide ? 'max-w-4xl' : 'max-w-md'} my-auto`}
      >
        <div className="flex justify-end">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-2">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
