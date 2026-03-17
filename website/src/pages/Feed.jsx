import React, { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'
import SocialCard from '../components/purchase/SocialCard'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

export default function Feed() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const renderedIdsRef = useRef(new Set())
  const statsIntervalRef = useRef(null)

  const loadFeed = async (isBackground = false) => {
    if (!isBackground) {
      const cached = cacheGet('feed')
      if (cached && cached.length > 0) {
        setItems(cached)
        setLoading(false)
        cached.forEach(item => renderedIdsRef.current.add(item.id))
      }
    }

    const result = await api.getFriendsFeed()
    if (result.ok) {
      const fresh = result.data || []
      cacheSet('feed', fresh)
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id))
        const newItems = fresh.filter(i => !existingIds.has(i.id))
        fresh.forEach(i => renderedIdsRef.current.add(i.id))
        if (newItems.length > 0) return [...newItems, ...prev]
        // Update existing items with fresh data
        return fresh
      })
      setLoading(false)
    } else if (loading) {
      setLoading(false)
    }
  }

  const pollStats = async () => {
    const ids = [...renderedIdsRef.current]
    if (!ids.length) return
    const result = await api.getPurchaseStats(ids)
    if (!result.ok) return
    const stats = result.data
    setItems(prev => prev.map(item => {
      const s = stats[item.id]
      if (!s) return item
      return {
        ...item,
        click_count: s.click_count ?? item.click_count,
        also_buying: s.also_buying ?? item.also_buying,
        also_buying_users: s.also_buying_users ?? item.also_buying_users,
      }
    }))
  }

  useEffect(() => {
    loadFeed()
    const statsInterval = setInterval(pollStats, 10000)
    return () => clearInterval(statsInterval)
  }, [])

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Friends' Feed</h1>
          <span className="text-sm text-gray-500">{items.length} items</span>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500">Loading your feed...</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <EmptyState
            icon="👥"
            title="Your feed is empty"
            description="Add friends to see what they're buying. Start by sending a friend request!"
            action={{ label: 'Find Friends', onClick: () => window.location.href = '/friends' }}
          />
        )}

        {items.length > 0 && (
          <div className="space-y-6">
            {items.map(item => (
              <SocialCard
                key={item.id}
                item={item}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
