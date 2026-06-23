import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tag, ChevronRight, Globe, AlertCircle } from 'lucide-react'
import type { Site, SaleEvent } from '@/lib/types'

// ── Status helpers (same logic as SalesManager) ─────────────────────────────

type Status = 'live' | 'scheduled' | 'ended' | 'paused'

function getStatus(event: SaleEvent): Status {
  const now = Date.now()
  const start = new Date(event.starts_at).getTime()
  const end = new Date(event.ends_at).getTime()
  if (!event.is_active) return 'paused'
  if (now < start) return 'scheduled'
  if (now > end) return 'ended'
  return 'live'
}

const STATUS_STYLE: Record<Status, { dot: string; bg: string; text: string; label: string }> = {
  live:      { dot: 'bg-green-500 animate-pulse', bg: 'bg-green-50',  text: 'text-green-700',  label: 'Live'      },
  scheduled: { dot: 'bg-blue-500',                bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Scheduled' },
  ended:     { dot: 'bg-gray-300',                bg: 'bg-gray-100',  text: 'text-gray-500',   label: 'Ended'     },
  paused:    { dot: 'bg-amber-400',               bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Paused'    },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SaleEventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const admin = createServiceClient()

  const [{ data: sites }, { data: allEvents }] = await Promise.all([
    admin.from('sites').select('*').order('product_name'),
    admin.from('sale_events').select('id, site_id, name, starts_at, ends_at, is_active').order('starts_at', { ascending: false }),
  ])

  if (!sites) return notFound()

  const eventsBySite = (allEvents ?? []).reduce<Record<string, SaleEvent[]>>((acc, ev) => {
    if (!acc[ev.site_id]) acc[ev.site_id] = []
    acc[ev.site_id].push(ev as SaleEvent)
    return acc
  }, {})

  const activeSites = (sites as Site[]).filter(s => s.is_active)
  const inactiveSites = (sites as Site[]).filter(s => !s.is_active)

  function SiteRow({ site }: { site: Site }) {
    const events = eventsBySite[site.id] ?? []
    const liveCount = events.filter(e => getStatus(e) === 'live').length
    const scheduledCount = events.filter(e => getStatus(e) === 'scheduled').length
    const recentEvents = events.slice(0, 3)

    return (
      <Link href={`/sites/${site.slug}/sales`}
        className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#0F4A35]/40 hover:shadow-sm transition-all">

        {/* Site icon */}
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#0F4A35' }}>
          <Globe size={18} className="text-white" />
        </div>

        {/* Site info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{site.product_name}</p>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{site.slug}</span>
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle size={10} /> No sale events yet
            </p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {liveCount} Live
                </span>
              )}
              {scheduledCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {scheduledCount} Scheduled
                </span>
              )}
              {recentEvents.map(ev => {
                const st = getStatus(ev)
                const cfg = STATUS_STYLE[st]
                if (st === 'live' || st === 'scheduled') return null
                return (
                  <span key={ev.id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                    {ev.name}
                  </span>
                )
              })}
              <span className="text-[10px] text-gray-400">{events.length} total</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#0F4A35] transition-colors shrink-0" />
      </Link>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0F4A35' }}>
          <Tag size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sale Events</h1>
          <p className="text-sm text-gray-500">Select a site to manage its sale events</p>
        </div>
      </div>

      {/* Flow breadcrumb hint */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
        <Tag size={11} className="text-[#0F4A35]" />
        <span className="font-semibold text-gray-600">Sale Events</span>
        <ChevronRight size={11} />
        <span>Select Site</span>
        <ChevronRight size={11} />
        <span>Manage Events</span>
      </div>

      {/* Active sites */}
      {activeSites.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Active Sites</p>
          {activeSites.map(site => <SiteRow key={site.id} site={site} />)}
        </div>
      )}

      {/* Inactive sites */}
      {inactiveSites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Inactive Sites</p>
          {inactiveSites.map(site => (
            <div key={site.id} className="opacity-50">
              <SiteRow site={site} />
            </div>
          ))}
        </div>
      )}

      {sites.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Tag size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sites found. Add a site first.</p>
        </div>
      )}

    </div>
  )
}
