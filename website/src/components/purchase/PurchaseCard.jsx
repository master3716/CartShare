import React, { useState } from 'react'
import { Trash2, ExternalLink, Eye, EyeOff, ShoppingBag, MessageCircle, Send, X } from 'lucide-react'
import { PlatformBadge, VisibilityBadge } from '../ui/Badge'
import Avatar from '../ui/Avatar'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function PurchaseCard({ purchase: initialPurchase, onDeleted, onVisibilityToggled }) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [purchase, setPurchase] = useState(initialPurchase)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Comments state
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)

  const handleToggleVisibility = async () => {
    if (toggling) return
    const prev = purchase.is_public
    setPurchase(p => ({ ...p, is_public: !p.is_public }))
    setToggling(true)
    const result = await api.toggleVisibility(purchase.id)
    setToggling(false)
    if (!result.ok) {
      setPurchase(p => ({ ...p, is_public: prev }))
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
      showToast('Failed to delete item', 'error')
    } else {
      onDeleted?.(purchase.id)
    }
  }

  const handleToggleComments = async () => {
    if (!showComments && !commentsLoaded) {
      const result = await api.getComments(purchase.id)
      if (result.ok) {
        setComments(result.data || [])
        setCommentsLoaded(true)
      }
    }
    setShowComments(p => !p)
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || posting) return
    const text = commentText.trim()
    setCommentText('')
    setPosting(true)

    // Optimistic
    const tempId = `temp_${Date.now()}`
    const tempComment = { id: tempId, text, username: user.username, avatar_url: user.avatar_url, created_at: new Date().toISOString() }
    setComments(prev => [...prev, tempComment])

    const result = await api.addComment(purchase.id, text)
    setPosting(false)
    if (result.ok) {
      setComments(prev => prev.map(c => c.id === tempId ? (result.data || tempComment) : c))
    } else {
      setComments(prev => prev.filter(c => c.id !== tempId))
      setCommentText(text)
      showToast('Failed to post comment', 'error')
    }
  }

  const handleDeleteComment = async (commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
    const result = await api.deleteComment(commentId)
    if (!result.ok) {
      const refresh = await api.getComments(purchase.id)
      if (refresh.ok) setComments(refresh.data || [])
      showToast('Failed to delete comment', 'error')
    }
  }

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden card-hover group animate-fade-in-up flex flex-col ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Image */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden relative">
        {purchase.image_url ? (
          <img
            src={purchase.image_url}
            alt={purchase.item_name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-600">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="font-semibold text-white text-sm leading-snug line-clamp-2">
          {purchase.item_name}
        </p>
        {purchase.price && (
          <p className="text-brand-400 font-bold text-base">{purchase.price}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={purchase.platform} />
          <VisibilityBadge isPublic={purchase.is_public} />
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex gap-2">
        <a
          href={purchase.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-3 py-2 rounded-xl transition-all text-sm active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          Buy Now
        </a>
        <button
          onClick={handleToggleComments}
          className={`p-2 rounded-xl transition-all relative ${showComments ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'}`}
          title="Comments"
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-brand-500 text-white rounded-full px-1">
              {comments.length}
            </span>
          )}
        </button>
        <button
          onClick={handleToggleVisibility}
          disabled={toggling}
          className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
          title={purchase.is_public ? 'Make Private' : 'Make Public'}
        >
          {purchase.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3 animate-fade-in">
          {!commentsLoaded && (
            <p className="text-xs text-gray-500">Loading comments...</p>
          )}
          {commentsLoaded && comments.length === 0 && (
            <p className="text-xs text-gray-500">No comments yet.</p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-2 group/comment">
              <Avatar username={comment.username} avatarUrl={comment.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">@{comment.username}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5 break-words">{comment.text}</p>
              </div>
              {(comment.username === user?.username || user?.username === purchase.username) && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="opacity-0 group-hover/comment:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Post comment */}
          <form onSubmit={handlePostComment} className="flex gap-2 pt-1">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || posting}
              className="p-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white transition-all disabled:opacity-40 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
