import React from 'react'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
      {icon && <div className="text-6xl mb-5 animate-float select-none">{icon}</div>}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm mb-6 max-w-xs">{description}</p>}
      {action && (
        <div className="animate-scale-in">
          <button
            onClick={action.onClick}
            className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}
