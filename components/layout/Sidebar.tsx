'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Globe, Settings, Rocket } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sites', label: 'Sites', icon: Globe },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen flex flex-col fixed left-0 top-0 z-40"
      style={{ background: '#0F4A35' }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20">
          <Rocket size={16} className="text-white" />
        </div>
        <span className="font-bold text-lg text-white tracking-tight">PagePilot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                color: active ? '#0F4A35' : 'rgba(255,255,255,0.75)',
                background: active ? '#ffffff' : 'transparent',
              }}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-white/40">PagePilot v1.0</p>
      </div>
    </aside>
  )
}
