import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, ShoppingCart, ExternalLink, Bookmark, X, Send, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { PlatformBadge } from '../ui/Badge'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { cacheGet, cacheSet } from '../../lib/cache'

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function SaveCollectionPopover({ purchaseId, onClose }) {
  const { showToast } = useToast()
  const [savedItems, setSavedItems] = useState([])
  const [collabs, setCollabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCat, setNewCat] = useState('')
  const { user } = useAuth()
  const inputRef = useRef(null)

  useEffect(() => {
    // Load from cache immediately
    const cached = cacheGet('collections')
    if (cached) {
      setSavedItems(cached.savedItems || [])
      setCollabs(cached.collabs || [])
      setLoading(false)
    }
    // Fetch fresh
    Promise.all([api.getSavedItems(), api.getCollections()]).then(([savedRes, collabRes]) => {
      const s = savedRes.ok ? savedRes.data : (cached?.savedItems || [])
      const c = collabRes.ok ? collabRes.data : (cached?.collabs || [])
      setSavedItems(s)
      setCollabs(c)
      cacheSet('collections', { savedItems: s, collabs: c })
      setLoading(false)
    })
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const existingCats = [...new Set(savedItems.map(s => s.category))]
  const savedInCats = new Set(savedItems.filter(s => s.purchase_id === purchaseId).map(s => s.category))

  const saveToCategory = async (category) => {
    if (!category?.trim()) return
    const cat = category.trim()
    if (savedInCats.has(cat)) return
    onClose('saved')
    const result = await api.saveItem(purchaseId, cat)
    if (result.ok) {
      showToast('Saved to ' + cat, 'success')
      const c = cacheGet('collections')
      if (c) {
        c.savedItems = [...(c.savedItems || []), { id: result.data?.id || ('t' + Date.now()), purchase_id: purchaseId, category: cat }]
        cacheSet('collections', c)
      }
    } else {
      showToast('Failed to save item', 'error')
    }
  }

  const addToCollab = async (collabId, requiresApproval) => {
    onClose('saved')
    const result = await api.addCollectionItem(collabId, purchaseId)
    if (result.ok) {
      showToast(requiresApproval ? 'Pending approval' : 'Added to collection', 'success')
    } else {
      showToast(result.data?.error || 'Failed', 'error')
    }
  }

  return (
    <div className="absolute right-0 bottom-full mb-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-56 overflow-hidden" onClick={e => e.stopPropagation()}>
      {loading && savedItems.length === 0 ? (
        <div className="p-3 text-xs text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Personal</div>
          {existingCats.map(cat => (
            <button
              key={cat}
              onClick={() => saveToCategory(cat)}
              disabled={savedInCats.has(cat)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${savedInCats.has(cat) ? 'text-gray-500' : 'text-gray-200'}`}
            >
              {savedInCats.has(cat) ? '✓' : '📁'} {cat}
            </button>
          ))}
          <div className="flex gap-1 px-3 py-2 border-t border-gray-800">
            <input
              ref={inputRef}
              type="text"
              placeholder="New category…"
              maxLength={50}
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { saveToCategory(newCat); setNewCat('') }
                if (e.key === 'Escape') onClose()
              }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 outline-none focus:border-brand-500"
            />
            <button
              onClick={() => { saveToCategory(newCat); setNewCat('') }}
              className="text-xs bg-brand-500 text-white rounded-lg px-2 hover:bg-brand-400 transition-colors"
            >
              Add
            </button>
          </div>

          {collabs.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-800">Collaborative</div>
              {collabs.map(c => {
                const already = (c.item_purchase_ids || []).includes(purchaseId) || (c.pending_purchase_ids || []).includes(purchaseId)
                const isOwner = c.owner_id === user?.id
                const needsApproval = !isOwner && c.requires_approval
                return (
                  <button
                    key={c.id}
                    onClick={() => !already && addToCollab(c.id, needsApproval)}
                    disabled={already}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${already ? 'text-gray-500' : 'text-gray-200'}`}
                  >
                    {already ? '✓' : '📋'} {c.name}{!already && needsApproval ? ' 🔒' : ''}
                  </button>
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function SocialCard({ item: initialItem, currentUserId }) {
  const { showToast } = useToast()
  const [item, setItem] = useState(initialItem)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showAlsoBuying, setShowAlsoBuying] = useState(false)
  const [showSavePopover, setShowSavePopover] = useState(false)
  const saveRef = useRef(null)

  const alsoBuying = item.also_buying || []
  const alsoBuyingUsers = item.also_buying_users || []
  const iAmBuying = currentUserId && alsoBuying.includes(currentUserId)
  const friendBuyers = alsoBuyingUsers.filter(u => u.id !== currentUserId)

  // Load comments when expanded
  useEffect(() => {
    if (showComments && !commentsLoaded) {
      api.getComments(item.id).then(r => {
        if (r.ok) setComments(r.data || [])
        setCommentsLoaded(true)
      })
    }
  }, [showComments])

  // Close save popover on outside click
  useEffect(() => {
    if (!showSavePopover) return
    const handler = (e) => {
      if (!saveRef.current?.contains(e.target)) setShowSavePopover(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showSavePopover])

  const handleShopNow = (e) => {
    e.preventDefault()
    // Optimistic click count
    setItem(prev => ({ ...prev, click_count: (prev.click_count || 0) + 1 }))
    window.open(item.product_url, '_blank')
    api.recordClick(item.id)
  }

  const handleMeToo = async () => {
    const wasActive = iAmBuying
    // Optimistic update
    if (wasActive) {
      setItem(prev => ({
        ...prev,
        also_buying: prev.also_buying.filter(id => id !== currentUserId),
        also_buying_users: prev.also_buying_users.filter(u => u.id !== currentUserId),
      }))
    } else {
      setItem(prev => ({
        ...prev,
        also_buying: [...(prev.also_buying || []), currentUserId],
      }))
    }

    const result = wasActive
      ? await api.unmarkAlsoBuying(item.id)
      : await api.markAlsoBuying(item.id)

    if (!result.ok) {
      // Revert
      setItem(initialItem)
      showToast("Something went wrong, your action wasn't saved.", 'error')
    }
  }

  const handleAddComment = async () => {
    const text = commentText.trim()
    if (!text) return

    const tempId = 'temp-' + Date.now()
    const tempComment = { id: tempId, user_id: currentUserId, username: '...', text, isTemp: true }
    setComments(prev => [...prev, tempComment])
    setCommentText('')

    const result = await api.addComment(item.id, text)
    if (result.ok) {
      setComments(prev => prev.map(c => c.id === tempId ? result.data : c))
    } else {
      setComments(prev => prev.filter(c => c.id !== tempId))
      setCommentText(text)
      showToast("Comment wasn't posted", 'error')
    }
  }

  const handleDeleteComment = async (commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
    const result = await api.deleteComment(commentId)
    if (!result.ok) {
      const freshResult = await api.getComments(item.id)
      if (freshResult.ok) setComments(freshResult.data || [])
      showToast("Comment wasn't deleted", 'error')
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <Avatar username={item.friend_username} avatarUrl={item.friend_avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">@{item.friend_username}</p>
          <p className="text-xs text-gray-500">{timeAgo(item.added_at)}</p>
        </div>
      </div>

      {/* Product Image */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <ShoppingBag className="w-12 h-12 text-gray-600" />
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold text-white leading-snug">{item.item_name}</p>
          {item.price && <p className="text-brand-400 font-bold text-lg mt-1">{item.price}</p>}
          <div className="mt-2">
            <PlatformBadge platform={item.platform} />
          </div>
        </div>

        {/* Click count */}
        <p className="text-xs text-gray-500">
          👆 {item.click_count || 0} {item.click_count === 1 ? 'person' : 'people'} clicked this
        </p>

        {/* Actions row */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleShopNow}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Shop Now
          </button>

          {currentUserId && (
            <button
              onClick={handleMeToo}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                iAmBuying
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {iAmBuying ? '✓ Me too' : 'Me too!'}
            </button>
          )}

          {currentUserId && (
            <div ref={saveRef} className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSavePopover(p => !p) }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-all"
              >
                <Bookmark className="w-4 h-4" />
                Save
              </button>
              {showSavePopover && (
                <SaveCollectionPopover
                  purchaseId={item.id}
                  onClose={(status) => setShowSavePopover(false)}
                />
              )}
            </div>
          )}

          <button
            onClick={() => setShowComments(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-all ml-auto"
          >
            <MessageCircle className="w-4 h-4" />
            {comments.length > 0 ? comments.length : ''}
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Also buying */}
        {friendBuyers.length > 0 && (
          <div>
            <button
              onClick={() => setShowAlsoBuying(p => !p)}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              🛒 {friendBuyers.length} {friendBuyers.length === 1 ? 'friend is' : 'friends are'} also buying this
              {showAlsoBuying ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showAlsoBuying && (
              <div className="mt-2 flex flex-wrap gap-2">
                {friendBuyers.map(u => (
                  <div key={u.id || u.username} className="flex items-center gap-1.5">
                    <Avatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                    <span className="text-xs text-gray-400">@{u.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div className="border-t border-gray-800 pt-3 space-y-2">
            {!commentsLoaded && <p className="text-xs text-gray-500">Loading comments...</p>}
            {commentsLoaded && comments.length === 0 && (
              <p className="text-xs text-gray-500">No comments yet. Be the first!</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar username={comment.username} avatarUrl={comment.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-300">@{comment.username} </span>
                  <span className="text-xs text-gray-400">{comment.text}</span>
                </div>
                {comment.user_id === currentUserId && !comment.isTemp && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {currentUserId && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddComment() }}
                  placeholder="Add a comment…"
                  maxLength={500}
                  className="flex-1 bg-gray-800 border border-gray-700 focus:border-brand-500 rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
                <button
                  onClick={handleAddComment}
                  className="p-1.5 rounded-xl bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
