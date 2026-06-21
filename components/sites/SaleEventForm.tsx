'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, Trash2, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import ImageUploader from './ImageUploader'
import type { SaleEvent } from '@/lib/types'

const PACK_KEYS = ['pack-1', 'pack-3', 'pack-5'] as const
const PACK_LABELS: Record<string, string> = { 'pack-1': '1 Bottle', 'pack-3': '3 Bottles', 'pack-5': '5 Bottles' }
const num = (min = 0) => z.preprocess(v => parseFloat(String(v)), z.number().min(min))

const saleSchema = z.object({
  name: z.string().min(1),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  label_text: z.string().optional(),
  banner_desktop_url: z.string().optional(),
  banner_mobile_url: z.string().optional(),
  label_image_desktop_url: z.string().optional(),
  label_image_mobile_url: z.string().optional(),
  is_active: z.boolean(),
  // per-pack sale prices
  'price-pack-1': num(0).optional(),
  'list_price-pack-1': num(0).optional(),
  'badge-pack-1': z.string().optional(),
  'price-pack-3': num(0).optional(),
  'list_price-pack-3': num(0).optional(),
  'badge-pack-3': z.string().optional(),
  'price-pack-5': num(0).optional(),
  'list_price-pack-5': num(0).optional(),
  'badge-pack-5': z.string().optional(),
})

type FormValues = z.infer<typeof saleSchema>

// Convert "2025-01-15T10:00" (local datetime-local input) to UTC ISO string
function localToUtc(local: string): string {
  return new Date(local).toISOString()
}
// Convert UTC ISO to datetime-local value for input
function utcToLocal(utc: string): string {
  const d = new Date(utc)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

type Props = {
  siteId: string
  siteSlug: string
  event?: SaleEvent
}

export default function SaleEventForm({ siteId, siteSlug, event }: Props) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [collapsed, setCollapsed] = useState(!!event)

  const sp = (key: string, field: 'price' | 'list_price' | 'badge') =>
    event?.sale_prices?.find(p => p.pack_key === key)?.[field]

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(saleSchema) as Resolver<FormValues>,
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
        'price-pack-1': (sp('pack-1', 'price') as number | undefined) ?? undefined,
        'list_price-pack-1': (sp('pack-1', 'list_price') as number | null | undefined) ?? undefined,
        'badge-pack-1': (sp('pack-1', 'badge') as string | null | undefined) ?? '',
        'price-pack-3': (sp('pack-3', 'price') as number | undefined) ?? undefined,
        'list_price-pack-3': (sp('pack-3', 'list_price') as number | null | undefined) ?? undefined,
        'badge-pack-3': (sp('pack-3', 'badge') as string | null | undefined) ?? '',
        'price-pack-5': (sp('pack-5', 'price') as number | undefined) ?? undefined,
        'list_price-pack-5': (sp('pack-5', 'list_price') as number | null | undefined) ?? undefined,
        'badge-pack-5': (sp('pack-5', 'badge') as string | null | undefined) ?? '',
      },
    })

  const isActive = watch('is_active')
  const bannerDesktop = watch('banner_desktop_url') ?? ''
  const bannerMobile = watch('banner_mobile_url') ?? ''
  const labelDesktop = watch('label_image_desktop_url') ?? ''
  const labelMobile = watch('label_image_mobile_url') ?? ''

  async function onSubmit(data: FormValues) {
    setSaving(true)
    try {
      const body = {
        ...(event?.id ? { id: event.id } : {}),
        site_id: siteId,
        name: data.name,
        starts_at: localToUtc(data.starts_at),
        ends_at: localToUtc(data.ends_at),
        label_text: data.label_text || null,
        banner_desktop_url: data.banner_desktop_url || null,
        banner_mobile_url: data.banner_mobile_url || null,
        label_image_desktop_url: data.label_image_desktop_url || null,
        label_image_mobile_url: data.label_image_mobile_url || null,
        is_active: data.is_active,
        sale_prices: PACK_KEYS
          .filter(k => data[`price-${k}` as keyof FormValues])
          .map(k => ({
            pack_key: k,
            price: data[`price-${k}` as keyof FormValues] as number,
            list_price: (data[`list_price-${k}` as keyof FormValues] as number | undefined) ?? null,
            badge: (data[`badge-${k}` as keyof FormValues] as string | undefined) || null,
            is_active: true,
          })),
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
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name + toggle */}
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

            {/* Date/time window */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Starts At (your local time)</Label>
                <Input {...register('starts_at')} type="datetime-local" className="h-8 text-xs" />
                {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ends At (your local time)</Label>
                <Input {...register('ends_at')} type="datetime-local" className="h-8 text-xs" />
                {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
              </div>
            </div>

            {/* Label */}
            <div className="space-y-1">
              <Label className="text-xs">Label Text <span className="text-muted-foreground">(shown if no label image)</span></Label>
              <Input {...register('label_text')} placeholder="Early Prime Day Sale" className="h-8 text-sm" />
            </div>

            {/* Label images */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Label Image — Desktop</Label>
                <ImageUploader
                  currentUrl={labelDesktop}
                  folder={`${siteSlug}/sales`}
                  filename={`label-desktop-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('label_image_desktop_url', url)}
                  label="Upload Desktop Label"
                />
                <Input {...register('label_image_desktop_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label Image — Mobile</Label>
                <ImageUploader
                  currentUrl={labelMobile}
                  folder={`${siteSlug}/sales`}
                  filename={`label-mobile-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('label_image_mobile_url', url)}
                  label="Upload Mobile Label"
                />
                <Input {...register('label_image_mobile_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
            </div>

            {/* Banner images */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sale Banner — Desktop</Label>
                <ImageUploader
                  currentUrl={bannerDesktop}
                  folder={`${siteSlug}/sales`}
                  filename={`banner-desktop-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('banner_desktop_url', url)}
                  label="Upload Desktop Banner"
                />
                <Input {...register('banner_desktop_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sale Banner — Mobile</Label>
                <ImageUploader
                  currentUrl={bannerMobile}
                  folder={`${siteSlug}/sales`}
                  filename={`banner-mobile-${event?.id ?? 'new'}`}
                  onUploaded={url => setValue('banner_mobile_url', url)}
                  label="Upload Mobile Banner"
                />
                <Input {...register('banner_mobile_url')} className="h-7 text-xs font-mono mt-1" />
              </div>
            </div>

            {/* Per-pack sale prices */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Sale Prices <span className="text-muted-foreground font-normal">(leave blank to keep regular price)</span></Label>
              {PACK_KEYS.map(k => (
                <div key={k} className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-3 text-xs font-medium text-gray-600 mb-1">{PACK_LABELS[k]}</div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Sale Price ($)</Label>
                    <Input {...register(`price-${k}` as keyof FormValues)} type="number" step="0.01" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">List Price ($)</Label>
                    <Input {...register(`list_price-${k}` as keyof FormValues)} type="number" step="0.01" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Badge</Label>
                    <Input {...register(`badge-${k}` as keyof FormValues)} placeholder="SAVE $144" className="h-7 text-xs" />
                  </div>
                </div>
              ))}
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
