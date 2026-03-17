import React from 'react'
import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 relative overflow-x-hidden">
      {/* Ambient background blobs */}
      <div className="fixed top-[-15%] left-[-10%] w-[600px] h-[600px] bg-brand-700/20 rounded-full blur-[120px] pointer-events-none animate-float" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-800/15 rounded-full blur-[140px] pointer-events-none animate-float-delayed" />
      <div className="fixed top-[40%] right-[20%] w-[350px] h-[350px] bg-violet-700/10 rounded-full blur-[100px] pointer-events-none animate-float-slow" />

      {/* Dot grid overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(124,92,246,0.15) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      <div className="relative z-10">
        <Navbar />
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}
