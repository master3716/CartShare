import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Layout from '../components/layout/Layout'
import AddPurchaseForm from '../components/purchase/AddPurchaseForm'
import SocialCard from '../components/purchase/SocialCard'
import EmptyState from '../components/ui/EmptyState'
import { Eye, EyeOff, Trash2 } from 'lucide-react'

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

function ManageBar({ purchase, onDeleted, onVisibilityToggled }) {
  const { showToast } = useToast()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isPublic, setIsPublic] = useState(purchase.is_public)

  const handleToggle = async () => {
    if (toggling) return
    const prev = isPublic
    setIsPublic(!prev)
    setToggling(true)
    const result = await api.toggleVisibility(purchase.id)
    setToggling(false)
    if (!result.ok) {
      setIsPublic(prev)
      showToast('Failed to update visibility', 'error')
    } else {
      onVisibilityToggled?.(purchase.id, !prev)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    setDeleting(true)
    const result = await api.deletePurchase(purchase.id)
    if (!result.ok) {
      setDeleting(false)
      showToast('Failed to delete', 'error')
    } else {
      onDeleted?.(purchase.id)
    }
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-gray-900/80 border border-gray-800 border-t-0 rounded-b-2xl -mt-2 ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
          isPublic
            ? 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25'
            : 'bg-gray-800 text-gray-500 hover:text-gray-300'
        }`}
      >
        {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {isPublic ? 'Public' : 'Private'}
      </button>
      <div className="flex-1" />
      <button
        onClick={handleDelete}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      const cached = cacheGet('my_purchases')
      if (cached) { setPurchases(cached); setLoading(false) }

      const result = await api.getPurchases()
      if (result.ok) {
        const data = result.data || []
        cacheSet('my_purchases', data)
        setPurchases(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleItemAdded = (newItem) => {
    setPurchases(prev => {
      const updated = [newItem, ...prev]
      cacheSet('my_purchases', updated)
      return updated
    })
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

  const toFeedItem = (p) => ({
    ...p,
    friend_username: user?.username,
    friend_avatar_url: user?.avatar_url,
  })

  const filtered = purchases.filter(p => {
    if (filter === 'public') return p.is_public
    if (filter === 'private') return !p.is_public
    return true
  })

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <h1 className="text-xl font-bold text-white">My List</h1>
          <span className="text-sm text-gray-500">{filtered.length} items</span>
        </div>

        <AddPurchaseForm onAdded={handleItemAdded} />

        {/* Filter tabs */}
        <div className="flex bg-gray-900 rounded-xl p-1 mb-6 w-fit animate-fade-in">
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

        {loading && purchases.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title={filter === 'all' ? 'Your list is empty' : `No ${filter} items`}
            description={filter === 'all' ? 'Add something above to get started!' : `You have no ${filter} items.`}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((purchase, index) => (
              <div
                key={purchase.id}
                style={{ animationDelay: `${Math.min(index * 0.08, 0.5)}s` }}
                className="animate-fade-in-up [animation-fill-mode:both]"
              >
                <div className="rounded-2xl overflow-hidden">
                  <SocialCard item={toFeedItem(purchase)} currentUser={user} />
                  <ManageBar
                    purchase={purchase}
                    onDeleted={handleDeleted}
                    onVisibilityToggled={handleVisibilityToggled}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
