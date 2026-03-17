import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/cache'
import { useNotifications } from '../hooks/useNotifications'
import Layout from '../components/layout/Layout'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../contexts/ToastContext'
import { Bell, Check, CheckCheck } from 'lucide-react'

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function notifIcon(type) {
  switch (type) {
    case 'friend_request': return '👋'
    case 'friend_accepted': return '🤝'
    case 'comment': return '💬'
    case 'me_too': return '🛒'
    default: return '🔔'
  }
}

function notifText(n) {
  switch (n.type) {
    case 'friend_request': return <><strong className="text-white">@{n.from_username}</strong> sent you a friend request.</>
    case 'friend_accepted': return <><strong className="text-white">@{n.from_username}</strong> accepted your friend request.</>
    case 'comment': return <><strong className="text-white">@{n.from_username}</strong> commented on your item: <em className="text-gray-400">{n.item_name}</em></>
    case 'me_too': return <><strong className="text-white">@{n.from_username}</strong> is also buying your item: <em className="text-gray-400">{n.item_name}</em></>
    default: return <>New notification from <strong className="text-white">@{n.from_username}</strong>.</>
  }
}

export default function Notifications() {
  const { showToast } = useToast()
  const { setUnreadCount } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async (showLoader = false) => {
    const cached = cacheGet('notifications')
    if (cached) {
      setNotifications(cached)
      setLoading(false)
    } else if (showLoader) {
      setLoading(true)
    }

    const result = await api.getNotifications()
    setLoading(false)
    if (result.ok) {
      const notifs = result.data || []
      cacheSet('notifications', notifs)
      setNotifications(notifs)
    }
  }

  useEffect(() => {
    loadNotifications(true)
    const interval = setInterval(() => loadNotifications(), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkRead = async (id) => {
    // Optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const result = await api.markNotificationRead(id)
    if (result.ok) {
      cacheInvalidate('notifications')
      setUnreadCount(prev => Math.max(0, prev - 1))
    } else {
      showToast('Failed to mark as read', 'error')
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n))
    }
  }

  const handleMarkAllRead = async () => {
    const result = await api.markAllNotificationsRead()
    if (result.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      cacheInvalidate('notifications')
      setUnreadCount(0)
    } else {
      showToast('Failed to mark all as read', 'error')
    }
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full">
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications"
            description="You're all caught up! Notifications will appear here when friends interact with your items."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`bg-gray-900 border rounded-2xl p-4 flex items-start gap-3 transition-all ${
                  n.read ? 'border-gray-800' : 'border-brand-500/30 bg-brand-500/5'
                }`}
              >
                <Avatar username={n.from_username} avatarUrl={n.from_avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-snug">
                    <span className="mr-1">{notifIcon(n.type)}</span>
                    {notifText(n)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-all"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
