'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, Trash2, Tag, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  // Display overrides — only active during the sale window
  label_override: string       // e.g. "6 Bottles"
  supply_override: string      // e.g. "180-Day Supply"
  image_url_override: string   // alternate pack image URL
  show_upsell: boolean
  upsell_bottles: string
  upsell_title: string
  upsell_price_each: string
  upsell_original_total: string
  upsell_discounted_total: string
  upsell_checkout_url: string
}

// ── Main form schema (metadata only — pack prices managed in state) ──────────

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

function utcToLocal(utc: string) {
  const d = new Date(utc)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function localToUtc(local: string) {
  return new Date(local).toISOString()
}
function numOrNull(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function blankEntry(pack_key: string, upsell?: Upsell): PackPriceEntry {
  return {
    pack_key,
    price: '',
    list_price: '',
    badge: '',
    label_override: '',
    supply_override: '',
    image_url_override: '',
    show_upsell: true,
    upsell_bottles: upsell ? String(upsell.bottles) : '',
    upsell_title: upsell?.title ?? '',
    upsell_price_each: upsell ? String(upsell.price_each) : '',
    upsell_original_total: upsell ? String(upsell.original_total) : '',
    upsell_discounted_total: upsell ? String(upsell.discounted_total) : '',
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
    show_upsell: sp.show_upsell ?? true,
    upsell_bottles: sp.upsell_bottles != null ? String(sp.upsell_bottles) : (upsell ? String(upsell.bottles) : ''),
    upsell_title: sp.upsell_title ?? upsell?.title ?? '',
    upsell_price_each: sp.upsell_price_each != null ? String(sp.upsell_price_each) : (upsell ? String(upsell.price_each) : ''),
    upsell_original_total: sp.upsell_original_total != null ? String(sp.upsell_original_total) : (upsell ? String(upsell.original_total) : ''),
    upsell_discounted_total: sp.upsell_discounted_total != null ? String(sp.upsell_discounted_total) : (upsell ? String(upsell.discounted_total) : ''),
    upsell_checkout_url: sp.upsell_checkout_url ?? upsell?.upsell_checkout_url ?? '',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  siteId: string
  siteSlug: string
  sitePackages: Package[]
  siteUpsells: Upsell[]
  event?: SaleEvent
}

export default function SaleEventForm({ siteId, siteSlug, sitePackages, siteUpsells, event }: Props) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [collapsed, setCollapsed] = useState(!!event)

  // All available pack keys from the site's packages
  const availablePackKeys = sitePackages.map(p => p.pack_key)
  const upsellByPackKey = Object.fromEntries(siteUpsells.map(u => [u.pack_key, u]))

  // Pack price entries — initialised from existing sale_prices or blank
  const [packEntries, setPackEntries] = useState<PackPriceEntry[]>(() => {
    if (event?.sale_prices && event.sale_prices.length > 0) {
      return event.sale_prices.map(sp =>
        salePriceToEntry(sp as SalePrice, upsellByPackKey[sp.pack_key])
      )
    }
    // Default: include all site packages
    return availablePackKeys.map(k => blankEntry(k, upsellByPackKey[k]))
  })

  // Which packs are included in this sale (user can toggle any on/off)
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
        // Ensure entry exists
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

  // Main metadata form
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MetaValues>({
    resolver: zodResolver(metaSchema) as Resolver<MetaValues>,
    defaultValues: {
      name: event?.name ?? '',
      starts_at: event?.starts_at ? utcToLocal(event.starts_at) : '',
      ends_at: event?.ends_at ? utcToLocal(event.ends_at) : '',
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
      const sale_prices = activeEntries.map(e => ({
        pack_key: e.pack_key,
        price: numOrNull(e.price),
        list_price: numOrNull(e.list_price),
        badge: e.badge || null,
        label_override: e.label_override || null,
        supply_override: e.supply_override || null,
        image_url_override: e.image_url_override || null,
        is_active: true,
        show_upsell: e.show_upsell,
        upsell_bottles: numOrNull(e.upsell_bottles),
        upsell_title: e.upsell_title || null,
        upsell_price_each: numOrNull(e.upsell_price_each),
        upsell_original_total: numOrNull(e.upsell_original_total),
        upsell_discounted_total: numOrNull(e.upsell_discounted_total),
        upsell_checkout_url: e.upsell_checkout_url || null,
      }))

      const body = {
        ...(event?.id ? { id: event.id } : {}),
        site_id: siteId,
        name: meta.name,
        starts_at: localToUtc(meta.starts_at),
        ends_at: localToUtc(meta.ends_at),
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
      if (!res.ok) toast.error('Save failed', { description: result.error })
      else {
        toast.success(event ? 'Sale updated!' : 'Sale event created!')
        if (!event) window.location.reload()
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
      window.location.reload()
    } else {
      const r = await res.json()
      toast.error('Delete failed', { description: r.error })
    }
  }

  const isNew = !event
  const activeEntries = packEntries.filter(e => includedKeys.has(e.pack_key))

  return (
    <Card className={isNew ? 'border-dashed' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag size={14} style={{ color: '#0F4A35' }} />
            {isNew ? 'New Sale Event' : event.name}
            {!isNew && (
              <span className={`ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {event.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
          </CardTitle>
          {!isNew && (
            <button type="button" onClick={() => setCollapsed(c => !c)}
              className="text-muted-foreground hover:text-foreground transition-colors">
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Name + active toggle */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Sale Name</Label>
                <Input {...register('name')} placeholder="Early Prime Day 2026" className="h-8 text-sm" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>

            {/* Date window */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Starts At <span className="text-muted-foreground">(local time)</span></Label>
                <Input {...register('starts_at')} type="datetime-local" className="h-8 text-xs" />
                {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ends At <span className="text-muted-foreground">(local time)</span></Label>
                <Input {...register('ends_at')} type="datetime-local" className="h-8 text-xs" />
                {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
              </div>
            </div>

            {/* Label text */}
            <div className="space-y-1">
              <Label className="text-xs">Label Text <span className="text-muted-foreground">(shown if no label image is uploaded)</span></Label>
              <Input {...register('label_text')} placeholder="Early Prime Day Sale" className="h-8 text-sm" />
            </div>

            {/* Label images */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Label Image — Desktop</Label>
                <ImageUploader currentUrl={labelDesktop} folder={`${siteSlug}/sales`}
                  filename={`label-desktop-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('label_image_desktop_url', url)} label="Upload Desktop Label" />
                <Input {...register('label_image_desktop_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label Image — Mobile</Label>
                <ImageUploader currentUrl={labelMobile} folder={`${siteSlug}/sales`}
                  filename={`label-mobile-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('label_image_mobile_url', url)} label="Upload Mobile Label" />
                <Input {...register('label_image_mobile_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
            </div>

            {/* Banners */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sale Banner — Desktop</Label>
                <ImageUploader currentUrl={bannerDesktop} folder={`${siteSlug}/sales`}
                  filename={`banner-desktop-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('banner_desktop_url', url)} label="Upload Desktop Banner" />
                <Input {...register('banner_desktop_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sale Banner — Mobile</Label>
                <ImageUploader currentUrl={bannerMobile} folder={`${siteSlug}/sales`}
                  filename={`banner-mobile-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('banner_mobile_url', url)} label="Upload Mobile Banner" />
                <Input {...register('banner_mobile_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
            </div>

            {/* ── Pack price entries ───────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Sale Prices per Pack</Label>
                <p className="text-[10px] text-muted-foreground">Leave price blank to keep regular price</p>
              </div>

              {/* Toggle which pack keys are included */}
              <div className="flex flex-wrap gap-2">
                {availablePackKeys.map(k => {
                  const pkg = sitePackages.find(p => p.pack_key === k)
                  const included = includedKeys.has(k)
                  return (
                    <button key={k} type="button" onClick={() => togglePackKey(k)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                        included
                          ? 'border-[#0F4A35] bg-[#0F4A35] text-white'
                          : 'border-gray-300 text-gray-500 hover:border-gray-400'
                      }`}>
                      {pkg?.label ?? k}
                    </button>
                  )
                })}
              </div>

              {/* Entry cards */}
              {activeEntries.map(entry => {
                const pkg = sitePackages.find(p => p.pack_key === entry.pack_key)
                return (
                  <div key={entry.pack_key} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    {/* Pack header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        {pkg?.label ?? entry.pack_key}
                        {pkg?.supply && <span className="ml-1.5 font-normal text-muted-foreground">· {pkg.supply}</span>}
                      </span>
                      <button type="button" onClick={() => togglePackKey(entry.pack_key)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Display overrides — shown only during sale */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">
                          Label Override <span className="text-muted-foreground">optional</span>
                        </Label>
                        <Input
                          placeholder={pkg?.label ?? ''}
                          value={entry.label_override}
                          onChange={e => updateEntry(entry.pack_key, 'label_override', e.target.value)}
                          className="h-7 text-xs" />
                        <p className="text-[9px] text-muted-foreground">e.g. "6 Bottles" during sale</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">
                          Supply Override <span className="text-muted-foreground">optional</span>
                        </Label>
                        <Input
                          placeholder={pkg?.supply ?? ''}
                          value={entry.supply_override}
                          onChange={e => updateEntry(entry.pack_key, 'supply_override', e.target.value)}
                          className="h-7 text-xs" />
                        <p className="text-[9px] text-muted-foreground">e.g. "180-Day Supply"</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">
                          Image Override URL <span className="text-muted-foreground">optional</span>
                        </Label>
                        <Input
                          placeholder="https://…"
                          value={entry.image_url_override}
                          onChange={e => updateEntry(entry.pack_key, 'image_url_override', e.target.value)}
                          className="h-7 text-xs font-mono" />
                        <p className="text-[9px] text-muted-foreground">Different pack image for sale</p>
                      </div>
                    </div>

                    {/* Sale price row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Sale Price ($)</Label>
                        <Input
                          type="number" step="0.01" placeholder={pkg ? String(pkg.price) : ''}
                          value={entry.price}
                          onChange={e => updateEntry(entry.pack_key, 'price', e.target.value)}
                          className="h-7 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">List Price ($) <span className="text-muted-foreground">optional</span></Label>
                        <Input
                          type="number" step="0.01" placeholder="strikethrough"
                          value={entry.list_price}
                          onChange={e => updateEntry(entry.pack_key, 'list_price', e.target.value)}
                          className="h-7 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Badge <span className="text-muted-foreground">optional</span></Label>
                        <Input
                          placeholder="SAVE $144"
                          value={entry.badge}
                          onChange={e => updateEntry(entry.pack_key, 'badge', e.target.value)}
                          className="h-7 text-xs" />
                      </div>
                    </div>

                    {/* Upsell section */}
                    <div className="space-y-2 pt-1 border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.show_upsell}
                          onCheckedChange={v => updateEntry(entry.pack_key, 'show_upsell', v)}
                        />
                        <Label className="text-[10px] font-semibold cursor-pointer">Show Upsell Offer</Label>
                        {!entry.show_upsell && (
                          <span className="text-[10px] text-muted-foreground">(upsell modal hidden during this sale)</span>
                        )}
                      </div>

                      {entry.show_upsell && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Upsell Bottles</Label>
                              <Input
                                type="number"
                                value={entry.upsell_bottles}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_bottles', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Upsell Title</Label>
                              <Input
                                placeholder="Buy 6 Bottles..."
                                value={entry.upsell_title}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_title', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Price Each ($)</Label>
                              <Input
                                type="number" step="0.01"
                                value={entry.upsell_price_each}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_price_each', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Original Total ($)</Label>
                              <Input
                                type="number" step="0.01"
                                value={entry.upsell_original_total}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_original_total', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Discounted Total ($)</Label>
                              <Input
                                type="number" step="0.01"
                                value={entry.upsell_discounted_total}
                                onChange={e => updateEntry(entry.pack_key, 'upsell_discounted_total', e.target.value)}
                                className="h-7 text-xs" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Upsell Checkout URL</Label>
                            <Input
                              placeholder="https://checkout.example.com/…"
                              value={entry.upsell_checkout_url}
                              onChange={e => updateEntry(entry.pack_key, 'upsell_checkout_url', e.target.value)}
                              className="h-7 text-xs font-mono" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {activeEntries.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                  No packs selected — toggle packs above to add sale prices
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="flex-1 text-white text-xs font-semibold"
                style={{ background: '#0F4A35' }} disabled={saving}>
                {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Save size={13} className="mr-1.5" />}
                {isNew ? 'Create Sale' : 'Save Changes'}
              </Button>
              {!isNew && (
                <Button type="button" size="sm" variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={onDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </Button>
              )}
            </div>

          </form>
        </CardContent>
      )}
    </Card>
  )
}
