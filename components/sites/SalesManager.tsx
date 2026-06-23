'use client'

import { useState } from 'react'
import { Plus, Tag, Calendar, Package2, ChevronRight, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SaleEventForm from './SaleEventForm'
import type { Package, SaleEvent, Upsell } from '@/lib/types'

type Props = {
  siteId: string
  siteSlug: string
  sitePackages: Package[]
  siteUpsells: Upsell[]
  events: SaleEvent[]
}

// ── Status helpers ─────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  live:      { label: 'Live',      dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700'  },
  scheduled: { label: 'Scheduled', dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  ended:     { label: 'Ended',     dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-500'   },
  paused:    { label: 'Paused',    dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700'  },
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'live' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}

function formatDateRange(starts: string, ends: string) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(starts)} – ${fmt(ends)}`
}

// ── Event list card ────────────────────────────────────────────────────────

function EventCard({
  event, selected, onClick,
}: { event: SaleEvent; selected: boolean; onClick: () => void }) {
  const status = getStatus(event)
  const packCount = event.sale_prices?.length ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-[#0F4A35] bg-[#0F4A35]/5 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <StatusBadge status={status} />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{event.name}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500">
            <Calendar size={10} />
            <span>{formatDateRange(event.starts_at, event.ends_at)}</span>
          </div>
          {packCount > 0 && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
              <Package2 size={10} />
              <span>{packCount} pack{packCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <ChevronRight size={14} className={`shrink-0 mt-1 transition-colors ${selected ? 'text-[#0F4A35]' : 'text-gray-300'}`} />
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SalesManager({ siteId, siteSlug, sitePackages, siteUpsells, events: initialEvents }: Props) {
  const [events, setEvents] = useState<SaleEvent[]>(initialEvents)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(
    initialEvents.length > 0 ? initialEvents[0].id : 'new'
  )

  const selectedEvent = selectedId === 'new' ? undefined : events.find(e => e.id === selectedId)

  // Called by SaleEventForm after a successful save/delete to refresh the list
  function handleSaved(updatedEvent?: SaleEvent) {
    if (!updatedEvent) {
      // Deleted
      setEvents(prev => prev.filter(e => e.id !== selectedId))
      setSelectedId(events.length > 1 ? events.find(e => e.id !== selectedId)?.id ?? 'new' : 'new')
    } else {
      const exists = events.find(e => e.id === updatedEvent.id)
      if (exists) {
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
      } else {
        setEvents(prev => [updatedEvent, ...prev])
        setSelectedId(updatedEvent.id)
      }
    }
  }

  const liveCount = events.filter(e => getStatus(e) === 'live').length
  const scheduledCount = events.filter(e => getStatus(e) === 'scheduled').length

  return (
    <div className="flex gap-5 h-full min-h-[600px]">

      {/* ── Left panel: event list ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col gap-3">

        {/* Stats row */}
        {events.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-700">{liveCount}</p>
              <p className="text-[10px] text-green-600 font-medium">Live</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{scheduledCount}</p>
              <p className="text-[10px] text-blue-600 font-medium">Scheduled</p>
            </div>
          </div>
        )}

        {/* New sale button */}
        <Button
          variant={selectedId === 'new' ? 'default' : 'outline'}
          size="sm"
          className={`w-full justify-start gap-2 text-xs font-semibold ${
            selectedId === 'new' ? 'text-white' : ''
          }`}
          style={selectedId === 'new' ? { background: '#0F4A35' } : {}}
          onClick={() => setSelectedId('new')}
        >
          <Plus size={13} />
          New Sale Event
        </Button>

        {/* Event cards */}
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg">
            <Tag size={20} className="text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">No sale events yet</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                selected={selectedId === event.id}
                onClick={() => setSelectedId(event.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: form ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <SaleEventForm
          key={selectedId ?? 'new'}
          siteId={siteId}
          siteSlug={siteSlug}
          sitePackages={sitePackages}
          siteUpsells={siteUpsells}
          event={selectedEvent}
          onSaved={handleSaved}
          onDeleted={() => handleSaved(undefined)}
        />
      </div>

    </div>
  )
}
