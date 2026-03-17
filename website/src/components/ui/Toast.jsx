import React from 'react'
import { useToast } from '../../contexts/ToastContext'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

function ToastItem({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />,
  }

  const colors = {
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    error: 'bg-red-500/15 border-red-500/30 text-red-300',
    info: 'bg-brand-500/15 border-brand-500/30 text-brand-300',
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl animate-slide-up ${colors[toast.type] || colors.info}`}>
      {icons[toast.type] || icons.info}
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
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
