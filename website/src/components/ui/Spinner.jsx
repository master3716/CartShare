import React from 'react'

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} relative flex-shrink-0 ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
      <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-purple-400 animate-spin" style={{ animationDuration: '0.6s', animationDirection: 'reverse' }} />
    </div>
  )
}
