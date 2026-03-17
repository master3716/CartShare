import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import Layout from '../components/layout/Layout'
import AddPurchaseForm from '../components/purchase/AddPurchaseForm'
import PurchaseCard from '../components/purchase/PurchaseCard'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import { PlatformBadge } from '../components/ui/Badge'
import { ExternalLink, ShoppingBag } from 'lucide-react'

function FriendsFeedStrip({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent from Friends</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
          {items.slice(0, 10).map(item => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex-shrink-0 w-44 hover:border-gray-700 transition-all"
            >
              <div className="h-24 bg-gray-800 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <ShoppingBag className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div className="p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar username={item.friend_username} avatarUrl={item.friend_avatar_url} size="sm" className="!w-5 !h-5 text-[10px]" />
                  <span className="text-[10px] text-gray-500 truncate">@{item.friend_username}</span>
                </div>
                <p className="text-xs text-white font-medium line-clamp-2 mb-1">{item.item_name}</p>
                {item.price && <p className="text-xs text-brand-400 font-semibold">{item.price}</p>}
                <div className="mt-1.5">
                  <PlatformBadge platform={item.platform} />
                </div>
                <a
                  href={item.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                  onClick={(e) => { e.stopPropagation(); api.recordClick(item.id) }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Shop Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [purchases, setPurchases] = useState([])
  const [feedItems, setFeedItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    // Load from cache first
    const cachedPurchases = cacheGet('my_purchases')
    const cachedFeed = cacheGet('dashboard_feed')
    if (cachedPurchases) {
      setPurchases(cachedPurchases)
      setLoading(false)
    }
    if (cachedFeed) setFeedItems(cachedFeed)

    // Fetch fresh
    const [purchasesResult, feedResult] = await Promise.all([
      api.getMyPurchases(),
      api.getFriendsFeed(),
    ])

    if (purchasesResult.ok) {
      const data = purchasesResult.data || []
      cacheSet('my_purchases', data)
      setPurchases(data)
    }
    if (feedResult.ok) {
      const data = feedResult.data || []
      cacheSet('dashboard_feed', data)
      setFeedItems(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleItemAdded = (newItem) => {
    setPurchases(prev => [newItem, ...prev])
    cacheSet('my_purchases', [newItem, ...purchases])
  }

  const handleDeleted = (id) => {
    setPurchases(prev => {
      const updated = prev.filter(p => p.id !== id)
      cacheSet('my_purchases', updated)
      return updated
    })
  }

  const handleVisibilityToggled = (id, newIsPublic) => {
    setPurchases(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, is_public: newIsPublic } : p)
      cacheSet('my_purchases', updated)
      return updated
    })
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">My List</h1>
          <span className="text-sm text-gray-500">{purchases.length} items</span>
        </div>

        <AddPurchaseForm onAdded={handleItemAdded} />

        <FriendsFeedStrip items={feedItems} />

        {loading && purchases.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title="Your list is empty"
            description="Start adding items you've bought or want to buy. Share them with friends!"
          />
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">My Items</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {purchases.map(purchase => (
                <PurchaseCard
                  key={purchase.id}
                  purchase={purchase}
                  onDeleted={handleDeleted}
                  onVisibilityToggled={handleVisibilityToggled}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
