'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Package, Upsell } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Save, Package as PackageIcon, TrendingUp, RefreshCw } from 'lucide-react'
// ImagePreview replaced by ImageUploader component
import ImageUploader from './ImageUploader'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// Build the CDN URL for a given slug + pack key
function pkgImageUrl(slug: string, packKey: string, ext = 'png') {
  const n = packKey.replace('pack-', '') // '1' | '3' | '5'
  return `${SUPABASE_URL}/storage/v1/object/public/images/${slug}/packages/pack-${n}-bottle.${ext}`
}
function upsellImageUrl(slug: string, packKey: string, ext = 'png') {
  const n = packKey.replace('pack-', '')
  return `${SUPABASE_URL}/storage/v1/object/public/images/${slug}/upsells/upsell-pack-${n}.${ext}`
}

const num = (min = 0) => z.preprocess(v => parseFloat(String(v)), z.number().min(min))
const numInt = (min = 0) => z.preprocess(v => parseInt(String(v), 10), z.number().int().min(min))

const packageSchema = z.object({
  label: z.string().min(1),
  supply: z.string().min(1),
  price: num(0),
  list_price: num(0).optional(),
  per_bottle: z.boolean(),
  free_shipping: z.boolean(),
  badge: z.string().optional(),
  package_image_url: z.string().optional(),
  checkout_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  sort_order: numInt(0),
  is_active: z.boolean(),
})

const upsellSchema = z.object({
  bottles: numInt(1),
  title: z.string().min(1),
  price_each: num(0),
  original_total: num(0),
  discounted_total: num(0),
  image_url: z.string().optional(),
  upsell_checkout_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})

type PackageFormValues = z.infer<typeof packageSchema>
type UpsellFormValues = z.infer<typeof upsellSchema>

type Props = {
  siteId: string
  siteSlug: string
  packKey: 'pack-1' | 'pack-3' | 'pack-5'
  pkg?: Package
  upsell?: Upsell
}

const PACK_LABELS: Record<string, string> = {
  'pack-1': '1 Bottle',
  'pack-3': '3 Bottles',
  'pack-5': '5 Bottles',
}


export default function PackageForm({ siteId, siteSlug, packKey, pkg, upsell }: Props) {
  const [saving, setSaving] = useState(false)

  // Derive default image URLs from convention if not already set
  const defaultPkgImg = pkg?.package_image_url || pkgImageUrl(siteSlug, packKey)
  const defaultUpsellImg = upsell?.image_url || upsellImageUrl(siteSlug, packKey)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema) as Resolver<PackageFormValues>,
    defaultValues: {
      label: pkg?.label ?? '',
      supply: pkg?.supply ?? '',
      price: pkg?.price ?? 0,
      list_price: pkg?.list_price ?? 0,
      per_bottle: pkg?.per_bottle ?? false,
      free_shipping: pkg?.free_shipping ?? false,
      badge: pkg?.badge ?? '',
      package_image_url: defaultPkgImg,
      checkout_url: pkg?.checkout_url ?? '',
      sort_order: pkg?.sort_order ?? 0,
      is_active: pkg?.is_active ?? true,
    },
  })

  const {
    register: regU,
    handleSubmit: handleSubmitU,
    setValue: setValueU,
    watch: watchU,
    formState: { errors: errorsU },
  } = useForm<UpsellFormValues>({
    resolver: zodResolver(upsellSchema) as Resolver<UpsellFormValues>,
    defaultValues: {
      bottles: upsell?.bottles ?? 2,
      title: upsell?.title ?? '',
      price_each: upsell?.price_each ?? 0,
      original_total: upsell?.original_total ?? 0,
      discounted_total: upsell?.discounted_total ?? 0,
      image_url: defaultUpsellImg,
      upsell_checkout_url: upsell?.upsell_checkout_url ?? '',
    },
  })

  async function onSavePackage(data: PackageFormValues) {
    setSaving(true)
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(pkg?.id ? { id: pkg.id } : {}),
        site_id: siteId,
        pack_key: packKey,
        ...data,
      }),
    })
    const result = await res.json()
    setSaving(false)
    if (!res.ok) toast.error('Save failed', { description: result.error })
    else toast.success(`${PACK_LABELS[packKey]} package saved!`)
  }

  async function onSaveUpsell(data: UpsellFormValues) {
    setSaving(true)
    const res = await fetch('/api/upsells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(upsell?.id ? { id: upsell.id } : {}),
        site_id: siteId,
        pack_key: packKey,
        ...data,
      }),
    })
    const result = await res.json()
    setSaving(false)
    if (!res.ok) toast.error('Upsell save failed', { description: result.error })
    else toast.success(`${PACK_LABELS[packKey]} upsell saved!`)
  }

  const perBottle = watch('per_bottle')
  const freeShipping = watch('free_shipping')
  const isActive = watch('is_active')
  const pkgImgUrl = watch('package_image_url') ?? ''
  const upsellImgUrl = watchU('image_url') ?? ''

  return (
    <div className="space-y-4">
      {/* Package card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PackageIcon size={15} style={{ color: '#0F4A35' }} />
            {PACK_LABELS[packKey]} — Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSavePackage)} className="space-y-3">

            {/* Package image */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Package Image</Label>
                <button
                  type="button"
                  onClick={() => setValue('package_image_url', pkgImageUrl(siteSlug, packKey))}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset to storage convention URL">
                  <RefreshCw size={10} /> Reset URL
                </button>
              </div>
              <ImageUploader
                currentUrl={pkgImgUrl}
                folder={`${siteSlug}/packages`}
                filename={`pack-${packKey.replace('pack-','')}-bottle`}
                onUploaded={(url) => setValue('package_image_url', url)}
                label="Upload Package Image"
              />
              <Input {...register('package_image_url')} className="h-7 text-xs font-mono mt-1" />
              <p className="text-xs text-muted-foreground">
                Path: <span className="font-mono">{siteSlug}/packages/pack-{packKey.replace('pack-','')}-bottle.{'{ext}'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input {...register('label')} placeholder="1 Month" className="h-8 text-sm" />
                {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Supply</Label>
                <Input {...register('supply')} placeholder="30-Day Supply" className="h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Price ($)</Label>
                <Input {...register('price')} type="number" step="0.01" className="h-8 text-sm" />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">List Price ($) <span className="text-muted-foreground">(strikethrough)</span></Label>
                <Input {...register('list_price')} type="number" step="0.01" className="h-8 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Checkout URL</Label>
              <Input {...register('checkout_url')} placeholder="https://checkout.example.com/…" className="h-8 text-sm" />
              {errors.checkout_url && <p className="text-xs text-destructive">{errors.checkout_url.message}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Badge</Label>
              <Input {...register('badge')} placeholder="MOST POPULAR - SAVE $75" className="h-8 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sort Order</Label>
                <Input {...register('sort_order')} type="number" className="h-8 text-sm" />
              </div>
            </div>

            <div className="flex flex-wrap gap-5 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={perBottle} onCheckedChange={v => setValue('per_bottle', v)} />
                <Label className="text-xs cursor-pointer">Per Bottle</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={freeShipping} onCheckedChange={v => setValue('free_shipping', v)} />
                <Label className="text-xs cursor-pointer">Free Shipping</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
                <Label className="text-xs cursor-pointer">Active</Label>
              </div>
            </div>

            <Button type="submit" size="sm" className="w-full text-white text-xs font-semibold mt-1"
              style={{ background: '#0F4A35' }} disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Save size={13} className="mr-1.5" />}
              Save Package
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Upsell card */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp size={15} className="text-amber-500" />
            {PACK_LABELS[packKey]} — Upsell
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitU(onSaveUpsell)} className="space-y-3">

            {/* Upsell image */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Upsell Image</Label>
                <button
                  type="button"
                  onClick={() => setValueU('image_url', upsellImageUrl(siteSlug, packKey))}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset to storage convention URL">
                  <RefreshCw size={10} /> Reset URL
                </button>
              </div>
              <ImageUploader
                currentUrl={upsellImgUrl}
                folder={`${siteSlug}/upsells`}
                filename={`upsell-pack-${packKey.replace('pack-','')}`}
                onUploaded={(url) => setValueU('image_url', url)}
                label="Upload Upsell Image"
              />
              <Input {...regU('image_url')} className="h-7 text-xs font-mono mt-1" />
              <p className="text-xs text-muted-foreground">
                Path: <span className="font-mono">{siteSlug}/upsells/upsell-pack-{packKey.replace('pack-','')}.{'{ext}'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bottles</Label>
                <Input {...regU('bottles')} type="number" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input {...regU('title')} placeholder="6 Month Supply" className="h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Price Each ($)</Label>
                <Input {...regU('price_each')} type="number" step="0.01" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Original Total ($)</Label>
                <Input {...regU('original_total')} type="number" step="0.01" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discounted Total ($)</Label>
                <Input {...regU('discounted_total')} type="number" step="0.01" className="h-8 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Upsell Checkout URL</Label>
              <Input {...regU('upsell_checkout_url')} placeholder="https://checkout.example.com/…" className="h-8 text-sm" />
              {errorsU.upsell_checkout_url && <p className="text-xs text-destructive">{errorsU.upsell_checkout_url.message}</p>}
            </div>

            <Button type="submit" size="sm" variant="outline" className="w-full text-xs font-semibold"
              disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Save size={13} className="mr-1.5" />}
              Save Upsell
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
