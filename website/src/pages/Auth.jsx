import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/ui/Spinner'

export default function Auth() {
  const { login, register, isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', username: '' })

  useEffect(() => {
    if (isLoggedIn) navigate('/feed')
  }, [isLoggedIn])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let result
    if (tab === 'login') {
      result = await login(form.email, form.password)
    } else {
      result = await register(form.username, form.email, form.password)
    }

    setLoading(false)

    if (result.ok) {
      showToast('Welcome to ShoppyCat! 🐱', 'success')
      navigate('/feed')
    } else {
      setError(result.data?.error || 'Something went wrong')
    }
  }

  const inputClass = "bg-gray-900/80 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all w-full"

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🐱</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
            ShoppyCat
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Share what you're buying with friends</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-gray-900 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'login' ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'register' ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="coolcat123"
                  required
                  minLength={3}
                  maxLength={30}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Loading...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
