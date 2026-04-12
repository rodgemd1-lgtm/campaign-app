'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/assessment', label: 'Assessment', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { href: '/upload', label: 'Upload', icon: 'M7 16a4 4 0 01-.88-7.863A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
  { href: '/results', label: 'Results', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/deliverables', label: 'Deliverables', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/coach', label: 'Coach', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
]

export default function WebappLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-[Inter,system-ui,sans-serif]">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">ResumeAI</span>
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <a key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${isActive ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                  {item.label}
                </a>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-gray-500 font-mono">QRSQPI v1.0</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-14 left-0 bottom-0 w-60 z-50 border-r border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-3">
          {/* Score card */}
          <div className="rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] p-3 mb-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">Session</div>
            <div className="text-xs text-gray-400" id="sidebar-score-text">
              {typeof window !== 'undefined' && sessionStorage.getItem('qrsqpiResults') ? 'Results loaded' : 'No assessment yet'}
            </div>
            <div className="mt-1.5 h-0.5 rounded-full bg-white/[0.06]">
              <div className="h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500" id="sidebar-progress-bar" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <a key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="pt-3 border-t border-white/[0.06]">
            <a href="/" className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Home
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pt-14 lg:pl-60 min-h-screen">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}