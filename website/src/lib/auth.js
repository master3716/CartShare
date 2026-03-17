export function getToken() {
  return localStorage.getItem('wishlist_token')
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('wishlist_user')) } catch { return null }
}

export function setAuth(token, user) {
  localStorage.setItem('wishlist_token', token)
  localStorage.setItem('wishlist_user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('wishlist_token')
  localStorage.removeItem('wishlist_user')
}

export function isLoggedIn() {
  return !!getToken()
}
