import React from 'react'
import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 relative overflow-x-hidden">

      {/* Animated dot grid */}
      <div className="fixed inset-0 pointer-events-none bg-dot-grid opacity-60" style={{
        maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)',
      }} />

      {/* Rotating conic glow ring */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none rotate-slow opacity-[0.04]" style={{
        background: 'conic-gradient(from 0deg, transparent 0deg, #7c5cf6 60deg, transparent 120deg, #a855f7 200deg, transparent 260deg, #7c5cf6 320deg, transparent 360deg)',
        borderRadius: '50%',
      }} />

      {/* Morphing orbs */}
      <div className="fixed top-[-10%] left-[-5%] w-[550px] h-[550px] bg-brand-700/25 rounded-full blur-[130px] pointer-events-none orb-1" />
      <div className="fixed bottom-[-15%] right-[-8%] w-[650px] h-[650px] bg-purple-800/20 rounded-full blur-[150px] pointer-events-none orb-2" />
      <div className="fixed top-[35%] left-[55%] w-[400px] h-[400px] bg-violet-600/12 rounded-full blur-[100px] pointer-events-none orb-3" />
      <div className="fixed top-[60%] left-[10%] w-[300px] h-[300px] bg-indigo-700/15 rounded-full blur-[90px] pointer-events-none animate-float-slow" />

      {/* Shooting stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '15%', delay: '0s',  dur: '6s',  w: '120px' },
          { top: '40%', delay: '2.5s', dur: '7s',  w: '80px'  },
          { top: '70%', delay: '5s',  dur: '5.5s', w: '100px' },
          { top: '25%', delay: '8s',  dur: '8s',  w: '60px'  },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: s.top,
            left: '-120px',
            width: s.w,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(124,92,246,0.8), rgba(168,85,247,0.4), transparent)',
            borderRadius: '999px',
            animation: `shootingStar ${s.dur} linear ${s.delay} infinite`,
            boxShadow: '0 0 6px rgba(124,92,246,0.6)',
          }} />
        ))}
      </div>

      <div className="relative z-10">
        <Navbar />
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}
