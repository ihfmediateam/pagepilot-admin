'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Loader2, Save, Trash2, Tag, X, Image, BadgeDollarSign, CalendarClock, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import ImageUploader from './ImageUploader'
import type { Package, SaleEvent, SalePrice, Upsell } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

type PackPriceEntry = {
  pack_key: string
  price: string
  list_price: string
  badge: string
  label_override: string
  supply_override: string
  image_url_override: string
  checkout_url: string         // overrides the pack's regular checkout URL during the sale
  show_upsell: boolean
  upsell_bottles: string
  upsell_title: string
  upsell_price_each: string
  upsell_original_total: string
  upsell_discounted_total: string
  upsell_image_url: string
  upsell_checkout_url: string
}

// ── Schema ───────────────────────────────────────────────────────────────────

const metaSchema = z.object({
  name: z.string().min(1, 'Required'),
  starts_at: z.string().min(1, 'Required'),
  ends_at: z.string().min(1, 'Required'),
  label_text: z.string().optional(),
  banner_desktop_url: z.string().optional(),
  banner_mobile_url: z.string().optional(),
  label_image_desktop_url: z.string().optional(),
  label_image_mobile_url: z.string().optional(),
  is_active: z.boolean(),
})
type MetaValues = z.infer<typeof metaSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

// All sale times are entered and displayed in US Eastern time (EST/EDT).
// Supabase stores UTC; we convert on read and on save.
const EST_TZ = 'America/New_York'

function utcToEst(utc: string): string {
  // Build a "YYYY-MM-DDTHH:mm" string in Eastern time for datetime-local input
  const d = new Date(utc)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EST_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

function estToUtc(estLocal: string): string {
  // estLocal = "YYYY-MM-DDTHH:mm" interpreted as Eastern time → UTC ISO string
  // We append the IANA tz via Intl trick: parse as if it were UTC offset for EST
  const [datePart, timePart] = estLocal.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart ?? '00:00').split(':').map(Number)
  // Use Date constructor + offset resolved from a reference point in that timezone
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute))
  // Compute the offset for America/New_York at that moment
  const estStr = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TZ, hour: 'numeric', hour12: false,
    timeZoneName: 'shortOffset',
  }).format(probe)
  const offsetMatch = estStr.match(/GMT([+-]\d+(?::\d+)?)/)
  const offsetHours = offsetMatch ? parseFloat(offsetMatch[1]) : -5
  const offsetMs = offsetHours * 60 * 60 * 1000
  return new Date(probe.getTime() - offsetMs).toISOString()
}
function numOrNull(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}
function blankEntry(pack_key: string, upsell?: Upsell): PackPriceEntry {
  return {
    pack_key, price: '', list_price: '', badge: '',
    label_override: '', supply_override: '', image_url_override: '',
    checkout_url: '',
    show_upsell: true,
    upsell_bottles: upsell ? String(upsell.bottles) : '',
    upsell_title: upsell?.title ?? '',
    upsell_price_each: upsell ? String(upsell.price_each) : '',
    upsell_original_total: upsell ? String(upsell.original_total) : '',
    upsell_discounted_total: upsell ? String(upsell.discounted_total) : '',
    upsell_image_url: upsell?.image_url ?? '',
    upsell_checkout_url: upsell?.upsell_checkout_url ?? '',
  }
}
function salePriceToEntry(sp: SalePrice, upsell?: Upsell): PackPriceEntry {
  return {
    pack_key: sp.pack_key,
    price: sp.price != null ? String(sp.price) : '',
    list_price: sp.list_price != null ? String(sp.list_price) : '',
    badge: sp.badge ?? '',
    label_override: sp.label_override ?? '',
    supply_override: sp.supply_override ?? '',
    image_url_override: sp.image_url_override ?? '',
    checkout_url: sp.checkout_url ?? '',
    show_upsell: sp.show_upsell ?? true,
    upsell_bottles: sp.upsell_bottles != null ? String(sp.upsell_bottles) : (upsell ? String(upsell.bottles) : ''),
    upsell_title: sp.upsell_title ?? upsell?.title ?? '',
    upsell_price_each: sp.upsell_price_each != null ? String(sp.upsell_price_each) : (upsell ? String(upsell.price_each) : ''),
    upsell_original_total: sp.upsell_original_total != null ? String(sp.upsell_original_total) : (upsell ? String(upsell.original_total) : ''),
    upsell_discounted_total: sp.upsell_discounted_total != null ? String(sp.upsell_discounted_total) : (upsell ? String(upsell.discounted_total) : ''),
    upsell_image_url: sp.upsell_image_url ?? upsell?.image_url ?? '',
    upsell_checkout_url: sp.upsell_checkout_url ?? upsell?.upsell_checkout_url ?? '',
  }
}

// ── Section accordion ────────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      style={{ background: 'linear-gradient(to right, #f8fffe, #f9fafb)' }}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  siteId: string
  siteSlug: string
  sitePackages: Package[]
  siteUpsells: Upsell[]
  event?: SaleEvent
  onSaved?: (event: SaleEvent) => void
  onDeleted?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SaleEventForm({
  siteId, siteSlug, sitePackages, siteUpsells, event, onSaved, onDeleted
}: Props) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isNew = !event

  const availablePackKeys = sitePackages.map(p => p.pack_key)
  const upsellByPackKey = Object.fromEntries(siteUpsells.map(u => [u.pack_key, u]))

  const [packEntries, setPackEntries] = useState<PackPriceEntry[]>(() => {
    if (event?.sale_prices && event.sale_prices.length > 0) {
      return event.sale_prices.map(sp => salePriceToEntry(sp as SalePrice, upsellByPackKey[sp.pack_key]))
    }
    return availablePackKeys.map(k => blankEntry(k, upsellByPackKey[k]))
  })

  const [includedKeys, setIncludedKeys] = useState<Set<string>>(
    () => new Set(packEntries.map(e => e.pack_key))
  )

  function togglePackKey(key: string) {
    setIncludedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        if (!packEntries.find(e => e.pack_key === key)) {
          setPackEntries(pe => [...pe, blankEntry(key, upsellByPackKey[key])])
        }
      }
      return next
    })
  }

  function updateEntry(key: string, field: keyof PackPriceEntry, value: string | boolean) {
    setPackEntries(prev => prev.map(e => e.pack_key === key ? { ...e, [field]: value } : e))
  }

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MetaValues>({
    resolver: zodResolver(metaSchema) as Resolver<MetaValues>,
    defaultValues: {
      name: event?.name ?? '',
      starts_at: event?.starts_at ? utcToEst(event.starts_at) : '',
      ends_at: event?.ends_at ? utcToEst(event.ends_at) : '',
      label_text: event?.label_text ?? '',
      banner_desktop_url: event?.banner_desktop_url ?? '',
      banner_mobile_url: event?.banner_mobile_url ?? '',
      label_image_desktop_url: event?.label_image_desktop_url ?? '',
      label_image_mobile_url: event?.label_image_mobile_url ?? '',
      is_active: event?.is_active ?? true,
    },
  })

  const isActive = watch('is_active')
  const bannerDesktop = watch('banner_desktop_url') ?? ''
  const bannerMobile = watch('banner_mobile_url') ?? ''
  const labelDesktop = watch('label_image_desktop_url') ?? ''
  const labelMobile = watch('label_image_mobile_url') ?? ''

  async function onSubmit(meta: MetaValues) {
    setSaving(true)
    try {
      const activeEntries = packEntries.filter(e => includedKeys.has(e.pack_key))
      const sale_prices = activeEntries.map(e => {
        const pkg = sitePackages.find(p => p.pack_key === e.pack_key)
        const upsell = upsellByPackKey[e.pack_key]
        return {
          pack_key: e.pack_key,
          // Blank → fall back to the placeholder value (regular package price)
          price: numOrNull(e.price) ?? (pkg?.price ?? null),
          list_price: numOrNull(e.list_price) ?? (pkg?.list_price ?? null),
          badge: e.badge || pkg?.badge || null,
          label_override: e.label_override || null,
          supply_override: e.supply_override || null,
          image_url_override: e.image_url_override || null,
          checkout_url: e.checkout_url || pkg?.checkout_url || null,
          is_active: true,
          show_upsell: e.show_upsell,
          // Blank upsell fields → fall back to the existing upsell row values
          upsell_bottles: numOrNull(e.upsell_bottles) ?? (upsell?.bottles ?? null),
          upsell_title: e.upsell_title || upsell?.title || null,
          upsell_price_each: numOrNull(e.upsell_price_each) ?? (upsell?.price_each ?? null),
          upsell_original_total: numOrNull(e.upsell_original_total) ?? (upsell?.original_total ?? null),
          upsell_discounted_total: numOrNull(e.upsell_discounted_total) ?? (upsell?.discounted_total ?? null),
          upsell_image_url: e.upsell_image_url || upsell?.image_url || null,
          upsell_checkout_url: e.upsell_checkout_url || upsell?.upsell_checkout_url || null,
        }
      })

      const body = {
        ...(event?.id ? { id: event.id } : {}),
        site_id: siteId,
        name: meta.name,
        starts_at: estToUtc(meta.starts_at),
        ends_at: estToUtc(meta.ends_at),
        label_text: meta.label_text || null,
        banner_desktop_url: meta.banner_desktop_url || null,
        banner_mobile_url: meta.banner_mobile_url || null,
        label_image_desktop_url: meta.label_image_desktop_url || null,
        label_image_mobile_url: meta.label_image_mobile_url || null,
        is_active: meta.is_active,
        sale_prices,
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error('Save failed', { description: result.error })
      } else {
        toast.success(isNew ? 'Sale event created!' : 'Sale updated!')
        onSaved?.(result.event)
      }
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!event?.id) return
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/sales/${event.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      toast.success('Sale deleted')
      onDeleted?.()
    } else {
      const r = await res.json()
      toast.error('Delete failed', { description: r.error })
    }
  }

  const activeEntries = packEntries.filter(e => includedKeys.has(e.pack_key))

  return (
    <div className="flex flex-col h-full">

      {/* ── Panel header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#0F4A35' }}>
            <Tag size={13} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {isNew ? 'New Sale Event' : event.name}
            </h2>
            <p className="text-[10px] text-gray-400">
              {isNew ? 'Configure a new sale window' : `Event · ${event.id.slice(0, 8)}…`}
            </p>
          </div>
        </div>

        {!isNew && (
          <Button
            type="button" size="sm" variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5 h-7 px-2.5 text-xs gap-1.5"
            onClick={onDelete} disabled={deleting}
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete
          </Button>
        )}
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 flex-1">

        {/* Section 1: Event Details */}
        <Section title="Event Details" icon={<CalendarClock size={14} className="text-[#0F4A35]" />}>

          {/* Name + active toggle */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium">Sale Name</Label>
              <Input {...register('name')} placeholder="Early Prime Day 2026" className="h-9 text-sm" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex items-center gap-2 pb-1.5 shrink-0">
              <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} id="is_active" />
              <Label htmlFor="is_active" className="text-xs cursor-pointer select-none">
                {isActive ? (
                  <span className="text-green-700 font-semibold">Active</span>
                ) : (
                  <span className="text-gray-400">Inactive</span>
                )}
              </Label>
            </div>
          </div>

          {/* Date window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Starts At <span className="text-gray-400 font-normal">(EST)</span>
              </Label>
              <Input {...register('starts_at')} type="datetime-local" className="h-9 text-xs" />
              {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Ends At <span className="text-gray-400 font-normal">(EST)</span>
              </Label>
              <Input {...register('ends_at')} type="datetime-local" className="h-9 text-xs" />
              {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
            </div>
          </div>

        </Section>

        {/* Section 2: Creative Assets */}
        <Section title="Creative Assets" icon={<Image size={14} className="text-[#0F4A35]" />} defaultOpen={false}>

          {/* Label text */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Label Text <span className="text-gray-400 font-normal">— shown if no label image is uploaded</span>
            </Label>
            <Input {...register('label_text')} placeholder="Early Prime Day Sale" className="h-9 text-sm" />
          </div>

          {/* Label images */}
          <div>
            <Label className="text-xs font-medium block mb-2">Label Images</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Desktop</p>
                <ImageUploader currentUrl={labelDesktop} folder={`${siteSlug}/sales`}
                  filename={`label-desktop-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('label_image_desktop_url', url)} label="Upload" />
                <Input {...register('label_image_desktop_url')} placeholder="or paste URL"
                  className="h-7 text-[10px] font-mono" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Mobile</p>
                <ImageUploader currentUrl={labelMobile} folder={`${siteSlug}/sales`}
                  filename={`label-mobile-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('label_image_mobile_url', url)} label="Upload" />
                <Input {...register('label_image_mobile_url')} placeholder="or paste URL"
                  className="h-7 text-[10px] font-mono" />
              </div>
            </div>
          </div>

          {/* Sale banners */}
          <div>
            <Label className="text-xs font-medium block mb-2">Sale Banners</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Desktop</p>
                <ImageUploader currentUrl={bannerDesktop} folder={`${siteSlug}/sales`}
                  filename={`banner-desktop-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('banner_desktop_url', url)} label="Upload" />
                <Input {...register('banner_desktop_url')} placeholder="or paste URL"
                  className="h-7 text-[10px] font-mono" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Mobile</p>
                <ImageUploader currentUrl={bannerMobile} folder={`${siteSlug}/sales`}
                  filename={`banner-mobile-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('banner_mobile_url', url)} label="Upload" />
                <Input {...register('banner_mobile_url')} placeholder="or paste URL"
                  className="h-7 text-[10px] font-mono" />
              </div>
            </div>
          </div>

        </Section>

        {/* Section 3: Pack Prices */}
        <Section title="Pack Prices" icon={<BadgeDollarSign size={14} className="text-[#0F4A35]" />}>

          {/* Pack toggles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Include in this sale</Label>
              <span className="text-[10px] text-gray-400">Leave price blank to keep regular price</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availablePackKeys.map(k => {
                const pkg = sitePackages.find(p => p.pack_key === k)
                const included = includedKeys.has(k)
                return (
                  <button key={k} type="button" onClick={() => togglePackKey(k)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      included
                        ? 'border-[#0F4A35] bg-[#0F4A35] text-white shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'
                    }`}>
                    {pkg?.label ?? k}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pack entry cards */}
          <div className="space-y-3">
            {activeEntries.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-6 border border-dashed rounded-lg">
                Select packs above to configure sale prices
              </div>
            )}
            {activeEntries.map(entry => {
              const pkg = sitePackages.find(p => p.pack_key === entry.pack_key)
              return (
                <div key={entry.pack_key} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">

                  {/* Pack card header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200"
                    style={{ background: 'linear-gradient(to right, #f0fdf4, #f8fafc)' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0F4A35]" />
                      <span className="text-sm font-bold text-gray-900">
                        {pkg?.label ?? entry.pack_key}
                      </span>
                      {pkg?.supply && (
                        <span className="text-xs text-gray-500 font-medium">· {pkg.supply}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => togglePackKey(entry.pack_key)}
                      className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="p-3 space-y-3">

                    {/* Display overrides */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">Display Overrides <span className="font-normal normal-case text-gray-500">(shown only during sale)</span></p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Label</Label>
                          <Input placeholder={pkg?.label ?? 'e.g. 6 Bottles'} value={entry.label_override}
                            onChange={e => updateEntry(entry.pack_key, 'label_override', e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Supply</Label>
                          <Input placeholder={pkg?.supply ?? 'e.g. 180-Day Supply'} value={entry.supply_override}
                            onChange={e => updateEntry(entry.pack_key, 'supply_override', e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Image</Label>
                          <ImageUploader currentUrl={entry.image_url_override} folder={`${siteSlug}/sales`}
                            filename={`img-override-${entry.pack_key}-${event?.id ?? 'new'}`}
                            onUploaded={url => updateEntry(entry.pack_key, 'image_url_override', url)} label="Upload" />
                          <Input placeholder="or paste URL" value={entry.image_url_override}
                            onChange={e => updateEntry(entry.pack_key, 'image_url_override', e.target.value)}
                            className="h-7 text-[10px] font-mono mt-1" />
                        </div>
                      </div>
                    </div>

                    {/* Sale pricing */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">Pricing</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Sale Price ($)</Label>
                          <Input type="number" step="0.01"
                            placeholder={pkg ? String(pkg.price) : 'optional'}
                            value={entry.price}
                            onChange={e => updateEntry(entry.pack_key, 'price', e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">List Price ($)</Label>
                          <Input type="number" step="0.01" placeholder="strikethrough"
                            value={entry.list_price}
                            onChange={e => updateEntry(entry.pack_key, 'list_price', e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Badge</Label>
                          <Input placeholder="SAVE $144" value={entry.badge}
                            onChange={e => updateEntry(entry.pack_key, 'badge', e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Checkout URL override */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                        Checkout URL Override
                        <span className="ml-1 font-normal normal-case text-gray-500">— use when relabeling (e.g. 5→6 bottles)</span>
                      </Label>
                      <Input
                        placeholder={pkg?.checkout_url ?? 'https://checkout.example.com/…'}
                        value={entry.checkout_url}
                        onChange={e => updateEntry(entry.pack_key, 'checkout_url', e.target.value)}
                        className="h-7 text-[10px] font-mono" />
                    </div>

                    {/* Upsell */}
                    <div className="border-t border-dashed border-gray-200 pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={entry.show_upsell}
                          onCheckedChange={v => updateEntry(entry.pack_key, 'show_upsell', v)} />
                        <Label className="text-xs font-semibold text-gray-800 cursor-pointer">Show Upsell Modal</Label>
                        {!entry.show_upsell && (
                          <span className="text-xs text-gray-500">— modal hidden, Order Now goes to checkout</span>
                        )}
                      </div>

                      {entry.show_upsell && (
                        <div className="space-y-2 pl-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Upsell Bottles</Label>
                              <Input type="number" value={entry.upsell_bottles}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_bottles', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Upsell Title</Label>
                              <Input placeholder="Buy 6 Bottles…" value={entry.upsell_title}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_title', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Price Each ($)</Label>
                              <Input type="number" step="0.01" value={entry.upsell_price_each}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_price_each', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Original Total ($)</Label>
                              <Input type="number" step="0.01" value={entry.upsell_original_total}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_original_total', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Discounted Total ($)</Label>
                              <Input type="number" step="0.01" value={entry.upsell_discounted_total}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_discounted_total', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Upsell Image</Label>
                            <ImageUploader
                              currentUrl={entry.upsell_image_url}
                              folder={`${siteSlug}/sales/upsells`}
                              filename={`upsell-${entry.pack_key}`}
                              onUploaded={url => updateEntry(entry.pack_key, 'upsell_image_url', url)}
                              label="Upload"
                            />
                            <Input placeholder="or paste URL"
                              value={entry.upsell_image_url}
                              onChange={e => updateEntry(entry.pack_key, 'upsell_image_url', e.target.value)}
                              className="h-7 text-[10px] font-mono" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Checkout URL</Label>
                            <Input placeholder="https://checkout.example.com/…"
                              value={entry.upsell_checkout_url}
                              onChange={e => updateEntry(entry.pack_key, 'upsell_checkout_url', e.target.value)}
                              className="h-7 text-[10px] font-mono" />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )
            })}
          </div>

        </Section>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div className="sticky bottom-0 pt-2 pb-1 bg-white">
          <Button type="submit" size="sm"
            className="w-full text-white text-sm font-semibold h-10 gap-2"
            style={{ background: '#0F4A35' }} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isNew ? 'Create Sale Event' : 'Save Changes'}
          </Button>
        </div>

      </form>
    </div>
  )
}
