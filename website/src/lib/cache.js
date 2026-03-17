import { getUser } from './auth'

function key(name) {
  const user = getUser()
  return `sc_${user ? user.id : 'anon'}_${name}`
}

export function cacheGet(name) {
  try { return JSON.parse(localStorage.getItem(key(name))) } catch { return null }
}

export function cacheSet(name, data) {
  try { localStorage.setItem(key(name), JSON.stringify(data)) } catch {}
}

export function cacheInvalidate(name) {
  localStorage.removeItem(key(name))
}

export function cacheRead(name) {
  return cacheGet(name)
}
