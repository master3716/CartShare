import React from 'react'

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div className={`${sizeClasses[size]} rounded-full border-gray-700 border-t-brand-500 animate-spin ${className}`} />
  )
}
