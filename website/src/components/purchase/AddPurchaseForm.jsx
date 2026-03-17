import React, { useState } from 'react'
import { Plus, ChevronDown, Link as LinkIcon } from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import Spinner from '../ui/Spinner'

function detectPlatform(url) {
  if (!url) return 'Other'
  const lower = url.toLowerCase()
  if (lower.includes('amazon.')) return 'Amazon'
  if (lower.includes('aliexpress.')) return 'AliExpress'
  if (lower.includes('temu.')) return 'Temu'
  if (lower.includes('shein.')) return 'Shein'
  if (lower.includes('etsy.')) return 'Etsy'
  return 'Other'
}

const platforms = ['Amazon', 'AliExpress', 'Temu', 'Shein', 'Etsy', 'Other']

export default function AddPurchaseForm({ onAdded }) {
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    url: '',
    name: '',
    price: '',
    platform: 'Other',
    isPublic: true,
  })

  const handleUrlChange = (e) => {
    const url = e.target.value
    const detected = detectPlatform(url)
    setForm(prev => ({ ...prev, url, platform: detected }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.url.trim() || !form.name.trim()) {
      showToast('URL and name are required', 'error')
      return
    }
    setLoading(true)
    const result = await api.addPurchase({
      product_url: form.url.trim(),
      item_name: form.name.trim(),
      price: form.price.trim() || null,
      platform: form.platform.toLowerCase(),
      is_public: form.isPublic,
    })
    setLoading(false)

    if (result.ok) {
      showToast('Item added!', 'success')
      setForm({ url: '', name: '', price: '', platform: 'Other', isPublic: true })
      setExpanded(false)
      onAdded?.(result.data)
    } else {
      showToast(result.data?.error || 'Failed to add item', 'error')
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
      <button
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-brand-400" />
          </div>
          <span className="font-semibold text-white">Add New Item</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Animated expand/collapse */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pt-0">
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Product URL *</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="url"
                  value={form.url}
                  onChange={handleUrlChange}
                  placeholder="https://amazon.com/..."
                  required
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="What did you buy?"
                required
                maxLength={200}
                className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Price</label>
                <input
                  type="text"
                  value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="$29.99"
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Platform</label>
                <select
                  value={form.platform}
                  onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white outline-none transition-all w-full"
                >
                  {platforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublic}
                onClick={() => setForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${form.isPublic ? 'bg-brand-500' : 'bg-gray-700'}`}
                style={{ height: '22px', width: '40px' }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isPublic ? 'translate-x-4.5' : 'translate-x-0'}`}
                  style={{ transform: form.isPublic ? 'translateX(18px)' : 'translateX(0)' }}
                />
              </button>
              <span className="text-sm text-gray-300">
                {form.isPublic ? 'Public — visible to friends' : 'Private — only you can see this'}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
