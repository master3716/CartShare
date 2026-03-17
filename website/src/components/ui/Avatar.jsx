import React from 'react'

const gradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
]

function getGradient(username) {
  if (!username) return gradients[0]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
}

export default function Avatar({ user, username, avatarUrl, size = 'md', className = '' }) {
  const name = username || user?.username || '?'
  const url = avatarUrl || user?.avatar_url
  const sizeClass = sizeClasses[size] || sizeClasses.md
  const gradient = getGradient(name)

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}>
      {name[0].toUpperCase()}
    </div>
  )
}
