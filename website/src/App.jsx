import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Toast from './components/ui/Toast'
import Auth from './pages/Auth'
import Feed from './pages/Feed'
import Dashboard from './pages/Dashboard'
import Friends from './pages/Friends'
import Collections from './pages/Collections'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Privacy from './pages/Privacy'
import MyListings from './pages/MyListings'
import { api } from './lib/api'

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { isLoggedIn } = useAuth()

  // Keep server alive every 14 minutes
  useEffect(() => {
    const ping = () => api.ping()
    ping()
    const interval = setInterval(ping, 14 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Routes>
      <Route path="/" element={
        isLoggedIn ? <Navigate to="/feed" replace /> : <Auth />
      } />
      <Route path="/feed" element={
        <ProtectedRoute><Feed /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/my-listings" element={
        <ProtectedRoute><MyListings /></ProtectedRoute>
      } />
      <Route path="/friends" element={
        <ProtectedRoute><Friends /></ProtectedRoute>
      } />
      <Route path="/collections" element={
        <ProtectedRoute><Collections /></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><Notifications /></ProtectedRoute>
      } />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
        <Toast />
      </ToastProvider>
    </AuthProvider>
  )
}
