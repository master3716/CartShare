import { API_BASE } from './config'

function getToken() {
  return localStorage.getItem('wishlist_token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 204) return { ok: true, data: null }

    let data = null
    const text = await res.text()
    if (text) { try { data = JSON.parse(text) } catch { data = { raw: text } } }

    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Cannot reach server.' } }
  }
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (username, email, password) => request('POST', '/auth/register', { username, email, password }),
  logout: () => request('POST', '/auth/logout'),

  // Users
  getMe: () => request('GET', '/users/me'),
  getUser: (username) => request('GET', `/users/${username}`),
  updateAvatar: (avatarDataUrl) => request('PATCH', '/users/me/avatar', { avatar_url: avatarDataUrl }),

  // Purchases
  getMyPurchases: () => request('GET', '/purchases'),
  getPurchases: () => request('GET', '/purchases'),
  getUserPurchases: (username) => request('GET', `/purchases/user/${username}`),
  addPurchase: (data) => request('POST', '/purchases', data),
  deletePurchase: (id) => request('DELETE', `/purchases/${id}`),
  toggleVisibility: (id) => request('PATCH', `/purchases/${id}/visibility`),
  updateCategories: (id, categories) => request('PATCH', `/purchases/${id}/category`, { categories }),
  clickPurchase: (id) => request('POST', `/purchases/${id}/click`).catch(() => {}),
  getPurchaseStats: (ids) => request('GET', `/purchases/stats?ids=${ids.join(',')}`),

  // Comments
  getComments: (purchaseId) => request('GET', `/purchases/${purchaseId}/comments`),
  addComment: (purchaseId, text) => request('POST', `/purchases/${purchaseId}/comments`, { text }),
  deleteComment: (commentId) => request('DELETE', `/comments/${commentId}`),

  // Me Too / Also Buying
  markAlsoBuying: (purchaseId) => request('POST', `/purchases/${purchaseId}/also-buying`),
  unmarkAlsoBuying: (purchaseId) => request('DELETE', `/purchases/${purchaseId}/also-buying`),

  // Saved Items
  getSavedItems: () => request('GET', '/saved-items'),
  saveItem: (purchaseId, category) => request('POST', '/saved-items', { purchase_id: purchaseId, category }),
  deleteSavedItem: (id) => request('DELETE', `/saved-items/${id}`),

  // Collections
  getCollections: () => request('GET', '/collections'),
  getCollection: (id) => request('GET', `/collections/${id}`),
  createCollection: (name) => request('POST', '/collections', { name }),
  deleteCollection: (id) => request('DELETE', `/collections/${id}`),
  inviteCollectionMember: (collectionId, username) => request('POST', `/collections/${collectionId}/members`, { username }),
  removeCollectionMember: (collectionId, memberId) => request('DELETE', `/collections/${collectionId}/members/${memberId}`),
  leaveCollection: (collectionId) => request('POST', `/collections/${collectionId}/members/leave`),
  addCollectionItem: (collectionId, purchaseId) => request('POST', `/collections/${collectionId}/items`, { purchase_id: purchaseId }),
  removeCollectionItem: (collectionId, purchaseId) => request('DELETE', `/collections/${collectionId}/items/${purchaseId}`),
  toggleCollectionApproval: (collectionId) => request('PATCH', `/collections/${collectionId}/approval`),
  approveCollectionItem: (collectionId, purchaseId) => request('POST', `/collections/${collectionId}/pending/${purchaseId}/approve`),
  rejectCollectionItem: (collectionId, purchaseId) => request('DELETE', `/collections/${collectionId}/pending/${purchaseId}`),

  // Friends
  getFriends: () => request('GET', '/friends'),
  getFriendsFeed: () => request('GET', '/friends/feed'),
  getPendingRequests: () => request('GET', '/friends/requests'),
  sendFriendRequest: (username) => request('POST', '/friends/request', { username }),
  acceptFriendRequest: (requesterId) => request('POST', '/friends/accept', { requester_id: requesterId }),
  rejectFriendRequest: (requesterId) => request('POST', '/friends/reject', { requester_id: requesterId }),
  removeFriend: (friendId) => request('DELETE', `/friends/${friendId}`),

  // Notifications
  getNotifications: () => request('GET', '/notifications'),
  getUnreadCount: () => request('GET', '/notifications/unread-count'),
  markNotificationRead: (id) => request('POST', `/notifications/${id}/read`),
  markAllNotificationsRead: () => request('POST', '/notifications/read-all'),

  // Health
  ping: () => request('GET', '/health').catch(() => {}),
}
