import React from 'react'

const platformColors = {
  amazon: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  aliexpress: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  temu: 'bg-red-500/20 text-red-300 border border-red-500/30',
  shein: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
  etsy: 'bg-orange-600/20 text-orange-400 border border-orange-600/30',
  other: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
}

export function PlatformBadge({ platform }) {
  const p = (platform || 'other').toLowerCase()
  const color = platformColors[p] || platformColors.other
  const label = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Other'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

export function VisibilityBadge({ isPublic }) {
  return isPublic ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
      Public
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
      Private
    </span>
  )
}
