import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function useNotifications() {
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const [unreadCount, setUnreadCount] = useState(0)
  const lastCountRef = useRef(null)

  const fetchCount = async () => {
    if (!isLoggedIn) return
    const result = await api.getUnreadCount()
    if (result.ok) {
      const count = result.data.count ?? 0
      if (lastCountRef.current !== null && count > lastCountRef.current) {
        showToast('You have new notifications 🔔', 'info')
      }
      lastCountRef.current = count
      setUnreadCount(count)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  return { unreadCount, setUnreadCount, refetch: fetchCount }
}
