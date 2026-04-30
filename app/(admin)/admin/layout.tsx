'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ) },
  { label: 'Periode', href: '/admin/periods', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ) },
  { label: 'Objek', href: '/admin/objects', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ) },
  { label: 'Pertanyaan', href: '/admin/questions', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) },
  { label: 'GA Staff', href: '/admin/ga-staff', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) },
  { label: 'Pengaturan', href: '/admin/settings', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) },
]

function Sidebar({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <aside className={`
      hidden md:flex flex-col fixed top-0 left-0 h-screen z-20
      bg-[#0d1117] border-r border-white/[0.06] transition-all duration-300
      ${collapsed ? 'w-16' : 'w-56'}
    `}>
      <div className={`h-16 flex items-center border-b border-white/[0.06] shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-5'}`}>
        <div className="w-7 h-7 rounded-lg bg-[#3b82f6] flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        {!collapsed && <span className="text-sm font-medium text-white/100 whitespace-nowrap">GA Admin</span>}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg transition-colors
                ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-3'}
                ${active
                  ? 'bg-[#3b82f6]/15 text-blue-400'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
            >
              {item.icon}
              {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className="p-2 border-t border-white/[0.06] shrink-0">
        <button
          onClick={onLogout}
          title={collapsed ? 'Keluar' : undefined}
          className={`w-full flex items-center rounded-lg text-white/30 hover:text-white/60 transition-colors
            ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span className="text-sm">Keluar</span>}
        </button>
      </div>
    </aside>
  )
}

function BottomNav({ onLogout }: { onLogout: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const visible = NAV_ITEMS.slice(0, 4)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0d1117]/95 backdrop-blur border-t border-white/[0.06]">
      <div className="flex items-center">
        {visible.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors
                ${active ? 'text-blue-400' : 'text-white/30 hover:text-white/60'}`}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </button>
          )
        })}
        <button
          onClick={onLogout}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-white/30 hover:text-white/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px]">Keluar</span>
        </button>
      </div>
    </nav>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    function check() {
      setSidebarCollapsed(window.innerWidth < 1024 && window.innerWidth >= 768)
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const sidebarWidth = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <Sidebar collapsed={sidebarCollapsed} onLogout={handleLogout} />
      <BottomNav onLogout={handleLogout} />

      <main className={`${sidebarWidth} transition-all duration-300 p-4 md:p-6 pb-24 md:pb-6`}>
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
