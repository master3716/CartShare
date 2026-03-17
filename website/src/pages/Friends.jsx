import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { cacheGet, cacheSet } from '../lib/cache'
import Layout from '../components/layout/Layout'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../contexts/ToastContext'
import { UserPlus, UserMinus, Check, X, ExternalLink } from 'lucide-react'

function FriendItem({ friend, onUnfriend }) {
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleUnfriend = async () => {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    const result = await api.removeFriend(friend.id)
    if (result.ok) {
      onUnfriend(friend.id)
    } else {
      showToast(result.data?.error || 'Failed to unfriend', 'error')
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-700 transition-all">
      <Avatar username={friend.username} avatarUrl={friend.avatar_url} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">@{friend.username}</p>
      </div>
      <div className="flex gap-2">
        <a
          href={`/profile/${friend.username}`}
          className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View
        </a>
        <button
          onClick={handleUnfriend}
          disabled={loading}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
            confirming
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400'
          }`}
        >
          {loading ? <Spinner size="sm" /> : <UserMinus className="w-3 h-3" />}
          {confirming ? 'Confirm?' : 'Unfriend'}
        </button>
        {confirming && (
          <button
            onClick={() => setConfirming(false)}
            className="px-2 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

function RequestItem({ requester, onAccept, onReject }) {
  const [loading, setLoading] = useState(null)

  const handleAccept = async () => {
    setLoading('accept')
    await onAccept(requester.id)
    setLoading(null)
  }

  const handleReject = async () => {
    setLoading('reject')
    await onReject(requester.id)
    setLoading(null)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-700 transition-all">
      <Avatar username={requester.username} avatarUrl={requester.avatar_url} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">@{requester.username}</p>
        <p className="text-xs text-gray-500">Sent you a friend request</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-all flex items-center gap-1 border border-emerald-500/30"
        >
          {loading === 'accept' ? <Spinner size="sm" /> : <Check className="w-3 h-3" />}
          Accept
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 text-xs font-medium transition-all flex items-center gap-1"
        >
          {loading === 'reject' ? <Spinner size="sm" /> : <X className="w-3 h-3" />}
          Decline
        </button>
      </div>
    </div>
  )
}

export default function Friends() {
  const { showToast } = useToast()
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendUsername, setSendUsername] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendMsg, setSendMsg] = useState(null)

  const loadData = async () => {
    const cachedFriends = cacheGet('friends')
    const cachedRequests = cacheGet('pending_requests')
    if (cachedFriends) { setFriends(cachedFriends); setLoading(false) }
    if (cachedRequests) setRequests(cachedRequests)

    const [friendsResult, requestsResult] = await Promise.all([
      api.getFriends(),
      api.getPendingRequests(),
    ])
    if (friendsResult.ok) {
      cacheSet('friends', friendsResult.data)
      setFriends(friendsResult.data)
    }
    if (requestsResult.ok) {
      cacheSet('pending_requests', requestsResult.data)
      setRequests(requestsResult.data)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSendRequest = async (e) => {
    e.preventDefault()
    if (!sendUsername.trim()) return
    setSendLoading(true)
    setSendMsg(null)
    const result = await api.sendFriendRequest(sendUsername.trim())
    setSendLoading(false)
    if (result.ok) {
      setSendMsg({ type: 'success', text: `Friend request sent to @${sendUsername}!` })
      setSendUsername('')
    } else {
      setSendMsg({ type: 'error', text: result.data?.error || 'Failed to send request' })
    }
  }

  const handleUnfriend = (friendId) => {
    const updated = friends.filter(f => f.id !== friendId)
    setFriends(updated)
    cacheSet('friends', updated)
  }

  const handleAccept = async (requesterId) => {
    const result = await api.acceptFriendRequest(requesterId)
    if (result.ok) {
      await loadData()
    } else {
      showToast(result.data?.error || 'Failed to accept', 'error')
    }
  }

  const handleReject = async (requesterId) => {
    const result = await api.rejectFriendRequest(requesterId)
    if (result.ok) {
      const updated = requests.filter(r => r.id !== requesterId)
      setRequests(updated)
      cacheSet('pending_requests', updated)
    } else {
      showToast(result.data?.error || 'Failed to reject', 'error')
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Send Request */}
        <div>
          <h1 className="text-xl font-bold text-white mb-4">Friends</h1>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Add a Friend</h2>
            <form onSubmit={handleSendRequest} className="flex gap-2">
              <div className="flex-1 relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={sendUsername}
                  onChange={e => setSendUsername(e.target.value)}
                  placeholder="Username"
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
                />
              </div>
              <button
                type="submit"
                disabled={sendLoading}
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 flex items-center gap-2 disabled:opacity-60"
              >
                {sendLoading ? <Spinner size="sm" /> : <UserPlus className="w-4 h-4" />}
                Send
              </button>
            </form>
            {sendMsg && (
              <p className={`mt-3 text-sm ${sendMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {sendMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Pending Requests ({requests.length})
            </h2>
            <div className="space-y-3">
              {requests.map(req => (
                <RequestItem
                  key={req.id}
                  requester={req}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            My Friends ({friends.length})
          </h2>
          {loading && friends.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : friends.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No friends yet"
              description="Send a friend request to connect with others and see their shopping lists!"
            />
          ) : (
            <div className="space-y-3">
              {friends.map(friend => (
                <FriendItem key={friend.id} friend={friend} onUnfriend={handleUnfriend} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
