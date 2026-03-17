import React, { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'
import SocialCard from '../components/purchase/SocialCard'
import EmptyState from '../components/ui/EmptyState'
import { CATEGORIES } from '../components/purchase/AddPurchaseForm'
import { Link } from 'react-router-dom'

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shimmer-bg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded shimmer-bg" />
          <div className="h-2 w-16 rounded shimmer-bg" />
        </div>
      </div>
      <div className="h-52 shimmer-bg" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded shimmer-bg" />
        <div className="h-3 w-1/4 rounded shimmer-bg" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-xl shimmer-bg" />
          <div className="h-8 w-24 rounded-xl shimmer-bg" />
        </div>
      </div>
    </div>
  )
}

export default function Feed() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const renderedIdsRef = useRef(new Set())

  const loadFeed = async () => {
    const cached = cacheGet('feed')
    if (cached && cached.length > 0) {
      setItems(cached)
      setLoading(false)
      cached.forEach(item => renderedIdsRef.current.add(item.id))
    }

    const result = await api.getFriendsFeed()
    if (result.ok) {
      const fresh = result.data || []
      cacheSet('feed', fresh)
      fresh.forEach(i => renderedIdsRef.current.add(i.id))
      setItems(fresh)
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

  const filtered = activeCategory
    ? items.filter(i => i.category === activeCategory)
    : items


  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <h1 className="text-xl font-bold text-white">Friends' Feed</h1>
          <span className="text-sm text-gray-500">{filtered.length} items</span>
        </div>

        {/* Category filter */}
        {!loading && items.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 mb-6 animate-fade-in">
            <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === ''
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                ✨ All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(activeCategory === cat.value ? '' : cat.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.value
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && items.length === 0 && (
          <EmptyState
            icon="👥"
            title="Your feed is empty"
            description="Add friends to see what they're buying!"
            action={<Link to="/friends" className="bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">Find Friends</Link>}
          />
        )}

        {!loading && items.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="🔍"
            title={`No ${CATEGORIES.find(c => c.value === activeCategory)?.label} items`}
            description="None of your friends have shared anything in this category yet."
          />
        )}

        {filtered.length > 0 && (
          <div className="space-y-6">
            {filtered.map((item, index) => (
              <div
                key={item.id}
                style={{ animationDelay: `${Math.min(index * 0.08, 0.5)}s` }}
                className="animate-fade-in-up [animation-fill-mode:both]"
              >
                <SocialCard item={item} currentUser={user} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
