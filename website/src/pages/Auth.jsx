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

  const inputClass = "bg-gray-900/80 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:shadow-lg focus:shadow-brand-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all w-full"

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-600/25 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-700/20 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />
      <div className="absolute top-[50%] left-[60%] w-[300px] h-[300px] bg-violet-600/15 rounded-full blur-[80px] animate-float-slow pointer-events-none" />

      {/* Static particle dots */}
      <div className="absolute top-[15%] left-[20%] w-1.5 h-1.5 bg-brand-400/30 rounded-full pointer-events-none" />
      <div className="absolute top-[70%] left-[15%] w-1 h-1 bg-purple-400/20 rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-2 h-2 bg-brand-300/20 rounded-full pointer-events-none" />
      <div className="absolute top-[80%] right-[25%] w-1.5 h-1.5 bg-violet-400/25 rounded-full pointer-events-none" />
      <div className="absolute top-[45%] left-[8%] w-1 h-1 bg-brand-500/30 rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-1 h-1 bg-purple-500/25 rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 select-none animate-float">🐱</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
            ShoppyCat
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Share what you're buying with friends</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl animated-border">
          {/* Tab switcher */}
          <div className="flex bg-gray-900 rounded-xl p-1 mb-6 relative">
            {/* Sliding indicator */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-brand-500 shadow-lg transition-transform duration-300 ease-out ${tab === 'register' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
            />
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative z-10 ${tab === 'login' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative z-10 ${tab === 'register' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div className="animate-fade-in-up-fast">
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
                minLength={tab === 'register' ? 6 : undefined}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 via-purple-600 to-brand-500 bg-[length:200%_auto] animate-gradient-x text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2 hover:shadow-brand-500/40 hover:shadow-xl"
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
