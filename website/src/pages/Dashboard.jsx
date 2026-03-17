import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Layout from '../components/layout/Layout'
import AddPurchaseForm, { CATEGORIES, detectCategories } from '../components/purchase/AddPurchaseForm'
import SocialCard from '../components/purchase/SocialCard'
import EmptyState from '../components/ui/EmptyState'
import { Eye, EyeOff, Trash2, Tag, Check, X } from 'lucide-react'

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

function ManageBar({ purchase, onDeleted, onVisibilityToggled, onCategoriesUpdated }) {
  const { showToast } = useToast()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isPublic, setIsPublic] = useState(purchase.is_public)
  const [editingCats, setEditingCats] = useState(false)
  const [pendingCats, setPendingCats] = useState(purchase.categories || [])
  const [savingCats, setSavingCats] = useState(false)

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

  const togglePendingCat = (value) => {
    setPendingCats(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    )
  }

  const saveCats = async () => {
    setSavingCats(true)
    const result = await api.updateCategories(purchase.id, pendingCats)
    setSavingCats(false)
    if (result.ok) {
      onCategoriesUpdated?.(purchase.id, pendingCats)
      setEditingCats(false)
    } else {
      showToast('Failed to update categories', 'error')
    }
  }

  return (
    <div className={`bg-gray-900/80 border border-gray-800 border-t-0 rounded-b-2xl -mt-2 ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Main manage row */}
      <div className="flex items-center gap-2 px-3 py-2">
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
        <button
          onClick={() => { setEditingCats(e => !e); setPendingCats(purchase.categories || []) }}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
            editingCats ? 'bg-brand-500/15 text-brand-400' : 'bg-gray-800 text-gray-500 hover:text-gray-300'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          {(purchase.categories || []).length > 0 ? `${(purchase.categories || []).length} tag${(purchase.categories || []).length > 1 ? 's' : ''}` : 'Tags'}
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

      {/* Category editor */}
      {editingCats && (
        <div className="px-3 pb-3 border-t border-gray-800 pt-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => togglePendingCat(c.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  pendingCats.includes(c.value)
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveCats}
              disabled={savingCats}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-400 transition-all disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              {savingCats ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditingCats(false)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [activeCategory, setActiveCategory] = useState('')

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

  const handleCategoriesUpdated = (id, newCategories) => {
    setPurchases(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, categories: newCategories } : p)
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
    if (filter === 'public' && !p.is_public) return false
    if (filter === 'private' && p.is_public) return false
    if (activeCategory && !(p.categories || []).includes(activeCategory)) return false
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

        {/* Visibility + category filters */}
        <div className="flex flex-wrap gap-3 mb-6 animate-fade-in">
          <div className="flex bg-gray-900 rounded-xl p-1 w-fit">
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
        </div>

        {purchases.length > 0 && (
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
                    onCategoriesUpdated={handleCategoriesUpdated}
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
