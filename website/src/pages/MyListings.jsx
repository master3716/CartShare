import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'
import SocialCard from '../components/purchase/SocialCard'
import EmptyState from '../components/ui/EmptyState'
import { Link } from 'react-router-dom'

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shimmer-bg" />
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

export default function MyListings() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | public | private

  useEffect(() => {
    const load = async () => {
      const result = await api.getPurchases()
      if (result.ok) {
        setItems(result.data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  // Map own purchase to the shape SocialCard expects
  const toFeedItem = (p) => ({
    ...p,
    friend_username: user.username,
    friend_avatar_url: user.avatar_url,
  })

  const filtered = items.filter(p => {
    if (filter === 'public') return p.is_public
    if (filter === 'private') return !p.is_public
    return true
  })

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-xl font-bold text-white">My Listings</h1>
            <p className="text-sm text-gray-500 mt-0.5">How your items look to others</p>
          </div>
          <span className="text-sm text-gray-500">{filtered.length} items</span>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-gray-900 rounded-xl p-1 mb-6 animate-fade-in w-fit">
          {['all', 'public', 'private'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title={filter === 'all' ? "No listings yet" : `No ${filter} listings`}
            description={filter === 'all' ? "Add items on your dashboard to see them here." : `You have no ${filter} items.`}
            action={filter === 'all' && (
              <Link to="/dashboard" className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm active:scale-95">
                Go to Dashboard
              </Link>
            )}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((item, index) => (
              <div
                key={item.id}
                style={{ animationDelay: `${Math.min(index * 0.08, 0.5)}s` }}
                className="animate-fade-in-up [animation-fill-mode:both]"
              >
                <SocialCard item={toFeedItem(item)} currentUser={user} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
