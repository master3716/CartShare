import React from 'react'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
