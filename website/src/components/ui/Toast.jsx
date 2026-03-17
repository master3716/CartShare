import React from 'react'
import { useToast } from '../../contexts/ToastContext'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-brand-400 flex-shrink-0" />,
}

const borders = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-brand-500',
}

function ToastItem({ toast, onRemove }) {
  return (
    <div className={`relative animate-slide-up glass border-l-4 ${borders[toast.type] || borders.info} rounded-xl px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-sm shadow-2xl overflow-hidden`}>
      {icons[toast.type] || icons.info}
      <span className="text-sm text-white flex-1 font-medium">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-white/30"
          style={{
            animation: 'shrink 3.5s linear forwards',
            transformOrigin: 'left',
          }}
        />
      </div>
    </div>
  )
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
