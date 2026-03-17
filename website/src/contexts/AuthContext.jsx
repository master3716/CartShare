import React, { createContext, useContext, useState, useEffect } from 'react'
import { getToken, getUser, setAuth, clearAuth } from '../lib/auth'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser())
  const [token, setToken] = useState(() => getToken())

  const login = async (email, password) => {
    const result = await api.login(email, password)
    if (result.ok) {
      const { token: t, user: u } = result.data
      setAuth(t, u)
      setToken(t)
      setUser(u)
    }
    return result
  }

  const register = async (username, email, password) => {
    const result = await api.register(username, email, password)
    if (result.ok) {
      const { token: t, user: u } = result.data
      setAuth(t, u)
      setToken(t)
      setUser(u)
    }
    return result
  }

  const logout = async () => {
    await api.logout()
    clearAuth()
    setToken(null)
    setUser(null)
  }

  const updateUserAvatar = (avatarUrl) => {
    const updatedUser = { ...user, avatar_url: avatarUrl }
    localStorage.setItem('wishlist_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUserAvatar, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
