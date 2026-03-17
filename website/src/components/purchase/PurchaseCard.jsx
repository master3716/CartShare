import React, { useState } from 'react'
import { Trash2, ExternalLink, Eye, EyeOff, ShoppingBag } from 'lucide-react'
import { PlatformBadge, VisibilityBadge } from '../ui/Badge'
import { api } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'

export default function PurchaseCard({ purchase: initialPurchase, onDeleted, onVisibilityToggled }) {
  const { showToast } = useToast()
  const [purchase, setPurchase] = useState(initialPurchase)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleToggleVisibility = async () => {
    if (toggling) return
    // Optimistic
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

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Image */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden">
        {purchase.image_url ? (
          <img
            src={purchase.image_url}
            alt={purchase.item_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-600">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}
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
      <div className="px-4 pb-4 flex gap-2">
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
    </div>
  )
}
