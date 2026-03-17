import React from 'react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🐱</span>
            <span className="font-bold bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
              ShoppyCat
            </span>
          </Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">What We Collect</h2>
            <p className="text-sm leading-relaxed">
              ShoppyCat collects your username, email address, and the product links you choose to share.
              We also store profile images you upload and comments you post.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How We Use Your Data</h2>
            <p className="text-sm leading-relaxed">
              Your data is used solely to operate ShoppyCat — to show your friends what you're buying
              and to let you see what they're buying. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Public vs Private Items</h2>
            <p className="text-sm leading-relaxed">
              Items you mark as "Public" are visible to your friends and anyone with your profile link.
              Items marked "Private" are only visible to you. You can change visibility at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data Storage</h2>
            <p className="text-sm leading-relaxed">
              Your data is stored on secure servers hosted on Fly.io. We use industry-standard
              encryption for data in transit (HTTPS) and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cookies & Local Storage</h2>
            <p className="text-sm leading-relaxed">
              ShoppyCat uses browser localStorage to keep you logged in and to cache data for faster
              page loads. No third-party tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Your Rights</h2>
            <p className="text-sm leading-relaxed">
              You can delete your purchases at any time. If you'd like to delete your account and all
              associated data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p className="text-sm leading-relaxed">
              Questions about privacy? Reach out to us through the app or at our support email.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
