'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Globe, Tag, Package2, Rocket } from 'lucide-react'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    // active only on exact /dashboard
    match: (p: string) => p === '/dashboard',
  },
  {
    href: '/sites',
    label: 'Sites',
    icon: Globe,
    // active on /sites but NOT on /sites/*/sales or /sites/*/packages (those have their own nav items)
    match: (p: string) => p.startsWith('/sites') && !p.includes('/sales') && !p.includes('/packages'),
  },
  {
    href: '/pricing',
    label: 'Pricing',
    icon: Package2,
    match: (p: string) => p.startsWith('/pricing') || p.includes('/packages'),
  },
  {
    href: '/sales',
    label: 'Sale Events',
    icon: Tag,
    match: (p: string) => p.startsWith('/sales') || p.includes('/sales'),
  },
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
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Menu
        </p>

        {navItems.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                color: active ? '#0F4A35' : 'rgba(255,255,255,0.82)',
                background: active ? '#ffffff' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
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
