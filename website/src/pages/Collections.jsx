import React, { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Layout from '../components/layout/Layout'
import Avatar from '../components/ui/Avatar'
import { PlatformBadge } from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { Plus, ArrowLeft, Folder, Users, ShoppingBag, ExternalLink, Trash2, UserMinus, Check, X, Lock } from 'lucide-react'

// ---- Views ----
const VIEW_LIST = 'list'
const VIEW_PERSONAL = 'personal'
const VIEW_COLLAB = 'collab'

// ---- Personal category card ----
function PersonalItemCard({ saved, onRemove }) {
  const p = saved.purchase
  if (!p) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.item_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ShoppingBag className="w-8 h-8 text-gray-600" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-white line-clamp-2">{p.item_name}</p>
        {p.price && <p className="text-brand-400 font-bold text-sm">{p.price}</p>}
        <PlatformBadge platform={p.platform} />
        <div className="flex gap-2 pt-1">
          <a
            href={p.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-2 py-1.5 rounded-xl transition-all text-xs"
          >
            <ExternalLink className="w-3 h-3" />
            Buy
          </a>
          <button
            onClick={() => onRemove(saved.id)}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Collab item card ----
function CollabItemCard({ item, isPending, isOwner, onRemove, onApprove, onReject }) {
  const p = item.purchase
  if (!p) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.item_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ShoppingBag className="w-8 h-8 text-gray-600" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-white line-clamp-2">{p.item_name}</p>
        {p.price && <p className="text-brand-400 font-bold text-sm">{p.price}</p>}
        <PlatformBadge platform={p.platform} />
        <p className="text-[10px] text-gray-600">by @{item.added_by_username}</p>
        {isPending ? (
          <div className="flex gap-1 pt-1">
            <button
              onClick={() => onApprove(item.purchase_id)}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium py-1.5 rounded-xl transition-all border border-emerald-500/30"
            >
              <Check className="w-3 h-3" />
              Approve
            </button>
            <button
              onClick={() => onReject(item.purchase_id)}
              className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium py-1.5 rounded-xl transition-all"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            <a
              href={p.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-2 py-1.5 rounded-xl transition-all text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              Buy
            </a>
            {(isOwner || item.added_by_user_id === undefined) && onRemove && (
              <button
                onClick={() => onRemove(item.purchase_id)}
                className="p-1.5 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Personal Category Detail ----
function PersonalView({ category, items: initialItems, onBack }) {
  const { showToast } = useToast()
  const [items, setItems] = useState(initialItems)

  const handleRemove = async (savedId) => {
    // Optimistic
    setItems(prev => prev.filter(s => s.id !== savedId))
    const result = await api.deleteSavedItem(savedId)
    if (!result.ok) {
      setItems(initialItems)
      showToast("Couldn't remove item.", 'error')
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collections
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
          <Folder className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{category}</h1>
          <p className="text-sm text-gray-500">Personal · {items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {items.filter(s => s.purchase).length === 0 ? (
        <EmptyState icon="📁" title="Empty category" description="Items you save will appear here." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.filter(s => s.purchase).map(saved => (
            <PersonalItemCard key={saved.id} saved={saved} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Collab Collection Detail ----
function CollabView({ collectionId, onBack }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [coll, setColl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteMsg, setInviteMsg] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [createName, setCreateName] = useState('')
  const pollRef = useRef(null)
  const lastCountsRef = useRef({ items: -1, pending: -1, members: -1 })

  const loadCollection = async () => {
    const result = await api.getCollection(collectionId)
    setLoading(false)
    if (result.ok) {
      setColl(result.data)
      lastCountsRef.current = {
        items: (result.data.enriched_items || []).length,
        pending: (result.data.enriched_pending_items || []).length,
        members: (result.data.members || []).length,
      }
    } else {
      showToast('Could not load collection', 'error')
      onBack()
    }
  }

  useEffect(() => {
    loadCollection()
    pollRef.current = setInterval(async () => {
      const result = await api.getCollection(collectionId)
      if (!result.ok) return
      const c = result.data
      const newCounts = {
        items: (c.enriched_items || []).length,
        pending: (c.enriched_pending_items || []).length,
        members: (c.members || []).length,
      }
      const prev = lastCountsRef.current
      if (newCounts.items !== prev.items || newCounts.pending !== prev.pending || newCounts.members !== prev.members) {
        setColl(c)
        lastCountsRef.current = newCounts
      }
    }, 10000)
    return () => clearInterval(pollRef.current)
  }, [collectionId])

  if (loading || !coll) return (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  )

  const isOwner = coll.owner_id === user?.id

  const handleRemoveItem = async (purchaseId) => {
    // Optimistic
    setColl(prev => ({
      ...prev,
      enriched_items: prev.enriched_items.filter(i => i.purchase_id !== purchaseId),
    }))
    const result = await api.removeCollectionItem(collectionId, purchaseId)
    if (!result.ok) {
      showToast(result.data?.error || 'Failed to remove', 'error')
      loadCollection()
    }
  }

  const handleApprove = async (purchaseId) => {
    const pendingItem = coll.enriched_pending_items?.find(i => i.purchase_id === purchaseId)
    // Optimistic
    setColl(prev => ({
      ...prev,
      enriched_pending_items: prev.enriched_pending_items.filter(i => i.purchase_id !== purchaseId),
      enriched_items: [...(prev.enriched_items || []), { ...pendingItem }],
    }))
    const result = await api.approveCollectionItem(collectionId, purchaseId)
    if (!result.ok) {
      showToast(result.data?.error || 'Failed to approve', 'error')
      loadCollection()
    }
  }

  const handleReject = async (purchaseId) => {
    // Optimistic
    setColl(prev => ({
      ...prev,
      enriched_pending_items: prev.enriched_pending_items.filter(i => i.purchase_id !== purchaseId),
    }))
    const result = await api.rejectCollectionItem(collectionId, purchaseId)
    if (!result.ok) {
      showToast(result.data?.error || 'Failed to reject', 'error')
      loadCollection()
    }
  }

  const handleRemoveMember = async (memberId) => {
    const result = await api.removeCollectionMember(collectionId, memberId)
    if (result.ok) loadCollection()
    else showToast(result.data?.error || 'Failed to remove member', 'error')
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteUsername.trim()) return
    setInviteLoading(true)
    const result = await api.inviteCollectionMember(collectionId, inviteUsername.trim())
    setInviteLoading(false)
    if (result.ok) {
      setInviteMsg({ type: 'success', text: `@${inviteUsername} added!` })
      setInviteUsername('')
      loadCollection()
    } else {
      setInviteMsg({ type: 'error', text: result.data?.error || 'Failed to invite' })
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave this collection?')) return
    const result = await api.leaveCollection(collectionId)
    if (result.ok) onBack()
    else showToast(result.data?.error || 'Failed to leave', 'error')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this collection? This cannot be undone.')) return
    const result = await api.deleteCollection(collectionId)
    if (result.ok) onBack()
    else showToast(result.data?.error || 'Failed to delete', 'error')
  }

  const handleApprovalToggle = async () => {
    const prev = coll.requires_approval
    setColl(c => ({ ...c, requires_approval: !c.requires_approval }))
    const result = await api.toggleCollectionApproval(collectionId)
    if (!result.ok) {
      setColl(c => ({ ...c, requires_approval: prev }))
      showToast('Failed to update setting', 'error')
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collections
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{coll.name}</h1>
          <p className="text-sm text-gray-500">
            Collaborative · {(coll.enriched_items || []).length} item{(coll.enriched_items || []).length !== 1 ? 's' : ''}
            {isOwner ? ' · You own this' : ` · by @${coll.owner_username}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isOwner && (
            <button
              onClick={handleLeave}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm transition-all"
            >
              Leave
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-all"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Members strip */}
      <div className="glass rounded-2xl p-4 mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Members</h3>
        <div className="flex flex-wrap gap-4">
          {/* Owner */}
          <div className="flex flex-col items-center gap-1">
            <Avatar username={coll.owner_username} avatarUrl={coll.owner_avatar_url} size="md" />
            <span className="text-[10px] text-gray-400">@{coll.owner_username}</span>
            <span className="text-[9px] text-brand-400 font-medium">Owner</span>
          </div>
          {(coll.members || []).map(m => (
            <div key={m.id} className="flex flex-col items-center gap-1 relative group">
              <Avatar username={m.username} avatarUrl={m.avatar_url} size="md" />
              {isOwner && (
                <button
                  onClick={() => handleRemoveMember(m.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
              <span className="text-[10px] text-gray-400">@{m.username}</span>
            </div>
          ))}
        </div>

        {/* Approval toggle (owner only) */}
        {isOwner && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
            <button
              role="switch"
              aria-checked={coll.requires_approval}
              onClick={handleApprovalToggle}
              className={`relative flex-shrink-0 rounded-full transition-colors`}
              style={{ width: '40px', height: '22px', backgroundColor: coll.requires_approval ? '#7c5cf6' : '#374151' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: coll.requires_approval ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </button>
            <span className="text-sm text-gray-300 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Require approval for new items
            </span>
          </div>
        )}

        {/* Invite form (owner only) */}
        {isOwner && (
          <form onSubmit={handleInvite} className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
            <input
              type="text"
              placeholder="Invite by username"
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-brand-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={inviteLoading}
              className="bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm disabled:opacity-60"
            >
              {inviteLoading ? <Spinner size="sm" /> : 'Invite'}
            </button>
          </form>
        )}
        {inviteMsg && (
          <p className={`text-xs mt-2 ${inviteMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Pending items (owner only) */}
      {isOwner && coll.enriched_pending_items?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Pending Approval ({coll.enriched_pending_items.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {coll.enriched_pending_items.map(item => (
              <CollabItemCard
                key={item.purchase_id}
                item={item}
                isPending={true}
                isOwner={isOwner}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Items ({(coll.enriched_items || []).length})
        </h3>
        {(coll.enriched_items || []).length === 0 ? (
          <EmptyState icon="📋" title="No items yet" description="Add items to this collection." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {coll.enriched_items.map(item => (
              <CollabItemCard
                key={item.purchase_id}
                item={item}
                isPending={false}
                isOwner={isOwner}
                onRemove={isOwner ? handleRemoveItem : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Main Collections Page ----
export default function Collections() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [view, setView] = useState(VIEW_LIST)
  const [savedItems, setSavedItems] = useState([])
  const [collabs, setCollabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [personalCategory, setPersonalCategory] = useState(null)
  const [personalItems, setPersonalItems] = useState([])
  const [currentCollabId, setCurrentCollabId] = useState(null)
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createMsg, setCreateMsg] = useState(null)

  const loadData = async () => {
    const cached = cacheGet('collections')
    if (cached) {
      setSavedItems(cached.savedItems || [])
      setCollabs(cached.collabs || [])
      setLoading(false)
    }

    const [savedRes, collabRes] = await Promise.all([
      api.getSavedItems(),
      api.getCollections(),
    ])

    const s = savedRes.ok ? savedRes.data : (cached?.savedItems || [])
    const c = collabRes.ok ? collabRes.data : (cached?.collabs || [])
    setSavedItems(s)
    setCollabs(c)
    cacheSet('collections', { savedItems: s, collabs: c })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const openPersonal = (category) => {
    const byCategory = savedItems.filter(s => s.category === category)
    setPersonalCategory(category)
    setPersonalItems(byCategory)
    setView(VIEW_PERSONAL)
  }

  const openCollab = (id) => {
    setCurrentCollabId(id)
    setView(VIEW_COLLAB)
  }

  const goBack = () => {
    setView(VIEW_LIST)
    loadData()
  }

  const handleCreateCollection = async (e) => {
    e.preventDefault()
    if (!createName.trim()) return
    setCreateLoading(true)
    const result = await api.createCollection(createName.trim())
    setCreateLoading(false)
    if (result.ok) {
      setCreateName('')
      setCreateMsg({ type: 'success', text: 'Collection created!' })
      loadData()
    } else {
      setCreateMsg({ type: 'error', text: result.data?.error || 'Failed to create' })
    }
  }

  // Group saved items by category
  const byCategory = {}
  for (const s of savedItems) {
    if (!byCategory[s.category]) byCategory[s.category] = []
    byCategory[s.category].push(s)
  }

  if (view === VIEW_PERSONAL && personalCategory) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <PersonalView category={personalCategory} items={personalItems} onBack={goBack} />
        </div>
      </Layout>
    )
  }

  if (view === VIEW_COLLAB && currentCollabId) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <CollabView collectionId={currentCollabId} onBack={goBack} />
        </div>
      </Layout>
    )
  }

  // Main list view
  const hasContent = Object.keys(byCategory).length > 0 || collabs.length > 0

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Collections</h1>
        </div>

        {/* Create collaborative collection form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">New Collaborative Collection</h2>
          <form onSubmit={handleCreateCollection} className="flex gap-2">
            <input
              type="text"
              placeholder="Collection name…"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              maxLength={60}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={createLoading}
              className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-60"
            >
              {createLoading ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </form>
          {createMsg && (
            <p className={`text-sm mt-2 ${createMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {createMsg.text}
            </p>
          )}
        </div>

        {loading && !hasContent ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : !hasContent ? (
          <EmptyState
            icon="📁"
            title="No collections yet"
            description="Save items from the feed to personal categories, or create a collaborative collection to share with friends."
          />
        ) : (
          <div className="space-y-3">
            {/* Personal categories */}
            {Object.entries(byCategory).map(([category, items]) => (
              <button
                key={category}
                onClick={() => openPersonal(category)}
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 hover:border-gray-700 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{category}</p>
                  <p className="text-xs text-gray-500">Personal · {items.length} item{items.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-gray-600">›</span>
              </button>
            ))}

            {/* Collaborative collections */}
            {collabs.map(c => {
              const isOwner = c.owner_id === user?.id
              const totalMembers = (c.member_ids || []).length + 1
              return (
                <button
                  key={c.id}
                  onClick={() => openCollab(c.id)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 hover:border-gray-700 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      Collaborative · {c.item_count} item{c.item_count !== 1 ? 's' : ''}
                      · {totalMembers} member{totalMembers !== 1 ? 's' : ''}
                      · {isOwner ? 'You own this' : `by @${c.owner_username}`}
                    </p>
                  </div>
                  <span className="text-gray-600">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
