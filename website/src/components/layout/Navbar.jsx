import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, X, Home, LayoutDashboard, Users, FolderOpen, List } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNotifications } from '../../hooks/useNotifications'
import { api } from '../../lib/api'
import Avatar from '../ui/Avatar'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const fileInputRef = useRef(null)
  const { updateUserAvatar } = useAuth()
  const prevUnreadCount = useRef(unreadCount)
  const [bellKey, setBellKey] = useState(0)

  // Trigger wiggle animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      setBellKey(k => k + 1)
    }
    prevUnreadCount.current = unreadCount
  }, [unreadCount])

  const navLinks = [
    { to: '/feed', label: 'Feed', icon: <Home className="w-4 h-4" /> },
    { to: '/dashboard', label: 'My List', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/my-listings', label: 'My Feed', icon: <List className="w-4 h-4" /> },
    { to: '/friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
    { to: '/collections', label: 'Collections', icon: <FolderOpen className="w-4 h-4" /> },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 150
        canvas.height = 150
        const ctx = canvas.getContext('2d')
        const scale = Math.max(150 / img.width, 150 / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (150 - w) / 2, (150 - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        const result = await api.updateAvatar(dataUrl)
        if (result.ok) {
          updateUserAvatar(dataUrl)
          showToast('Avatar updated!', 'success')
        } else {
          showToast('Failed to update avatar', 'error')
        }
      }
      img.src = evt.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <nav className="sticky top-0 z-40 glass border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/feed" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🐱</span>
            <span className="font-bold text-lg bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
              ShoppyCat
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.icon}
                {link.label}
                {/* Active dot indicator */}
                {isActive(link.to) && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400 animate-scale-in" />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Bell key={bellKey} className={`w-5 h-5 ${bellKey > 0 ? 'animate-wiggle' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-brand-500 text-white rounded-full px-1 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar */}
            <button
              onClick={handleAvatarClick}
              className="relative group"
              title="Change profile picture"
            >
              <div className="ring-2 ring-white/20 group-hover:ring-brand-500/60 transition-all duration-300 rounded-full">
                <Avatar user={user} size="sm" />
              </div>
              <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">Edit</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Username */}
            <span className="hidden md:block text-sm text-gray-400 font-medium">
              @{user?.username}
            </span>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-white/10 pt-3 animate-fade-in">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
