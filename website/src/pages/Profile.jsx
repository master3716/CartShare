import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Avatar from '../components/ui/Avatar'
import { PlatformBadge } from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { ExternalLink, UserPlus, ShoppingBag } from 'lucide-react'

function PublicPurchaseCard({ purchase }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 hover:-translate-y-0.5 transition-all duration-200">
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden">
        {purchase.image_url ? (
          <img src={purchase.image_url} alt={purchase.item_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ShoppingBag className="w-8 h-8 text-gray-600" />
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-white text-sm line-clamp-2 mb-1">{purchase.item_name}</p>
        {purchase.price && <p className="text-brand-400 font-bold text-sm mb-2">{purchase.price}</p>}
        <PlatformBadge platform={purchase.platform} />
        <a
          href={purchase.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-3 py-2 rounded-xl transition-all text-xs active:scale-95"
        >
          <ExternalLink className="w-3 h-3" />
          Buy Now
        </a>
      </div>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [profileUser, setProfileUser] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [friendRequestSent, setFriendRequestSent] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => {
    const targetUsername = username
    if (!targetUsername) { setError('No user specified'); setLoading(false); return }
    document.title = `@${targetUsername}'s List — ShoppyCat`

    api.getUserPurchases(targetUsername).then(result => {
      setLoading(false)
      if (result.ok) {
        setPurchases(result.data || [])
        // Set basic profile info from first purchase or just the username
        setProfileUser({ username: targetUsername })
      } else {
        setError(result.data?.error || 'User not found')
      }
    })
  }, [username])

  const handleAddFriend = async () => {
    setSendingRequest(true)
    const result = await api.sendFriendRequest(username)
    setSendingRequest(false)
    if (result.ok) {
      setFriendRequestSent(true)
      showToast(`Friend request sent to @${username}!`, 'success')
    } else {
      showToast(result.data?.error || 'Failed to send request', 'error')
    }
  }

  const isOwnProfile = currentUser?.username === username

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😿</div>
        <h1 className="text-xl font-bold text-white mb-2">User not found</h1>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link to="/" className="text-brand-400 hover:text-brand-300 text-sm transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Simple nav bar for non-authenticated view */}
      <nav className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🐱</span>
            <span className="font-bold bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
              ShoppyCat
            </span>
          </Link>
          {currentUser && (
            <Link
              to="/feed"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back to App
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile hero */}
        <div className="glass rounded-2xl p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar username={username} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white mb-1">@{username}</h1>
            <p className="text-gray-400 text-sm">{purchases.length} public item{purchases.length !== 1 ? 's' : ''}</p>
            {currentUser && !isOwnProfile && (
              <button
                onClick={handleAddFriend}
                disabled={friendRequestSent || sendingRequest}
                className="mt-4 flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sendingRequest ? <Spinner size="sm" /> : <UserPlus className="w-4 h-4" />}
                {friendRequestSent ? '✓ Request Sent' : sendingRequest ? 'Sending...' : 'Add Friend'}
              </button>
            )}
          </div>
        </div>

        {/* Purchases grid */}
        {purchases.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title="No public items yet"
            description="This user hasn't shared any public purchases yet."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {purchases.map(p => (
              <PublicPurchaseCard key={p.id} purchase={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
