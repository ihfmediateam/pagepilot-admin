'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { SubscriptionPlan } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Save, RefreshCw, Star } from 'lucide-react'
import ImageUploader from './ImageUploader'

const num = (min = 0) => z.preprocess(v => parseFloat(String(v)), z.number().min(min))
const numInt = (min = 0) => z.preprocess(v => parseInt(String(v), 10), z.number().int().min(min))
const optNum = () =>
  z.preprocess(v => (v === '' || v == null ? null : parseFloat(String(v))), z.number().min(0).nullable())

const planSchema = z.object({
  duration_label: z.string().min(1, 'Required'),
  interval_days: numInt(0),
  price: num(0),
  compare_at_price: optNum(),
  discount_label: z.string().optional(),
  cadence_label: z.string().optional(),
  badge: z.string().optional(),
  image_url: z.string().optional(),
  checkout_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  sort_order: numInt(0),
  is_active: z.boolean(),
})

type PlanFormValues = z.infer<typeof planSchema>

export type PlanKey = 'sub-30' | 'sub-45' | 'sub-60'

// Defaults per plan so a fresh site starts from sensible pill/cadence text.
const PLAN_META: Record<PlanKey, { title: string; duration: string; interval: number; cadence: string; sort: number }> = {
  'sub-30': { title: '30-Day Plan', duration: '30 Days', interval: 30, cadence: '1 month', sort: 1 },
  'sub-45': { title: '45-Day Plan', duration: '45 Days', interval: 45, cadence: '45 days', sort: 2 },
  'sub-60': { title: '60-Day Plan', duration: '60 Days', interval: 60, cadence: '60 days', sort: 3 },
}

type Props = {
  siteId: string
  siteSlug: string
  planKey: PlanKey
  plan?: SubscriptionPlan
  /** Whether this plan is the site's single default (owned by the parent editor). */
  isDefault: boolean
  onMakeDefault: () => void
}

export default function SubscriptionPlanForm({ siteId, siteSlug, planKey, plan, isDefault, onMakeDefault }: Props) {
  const [saving, setSaving] = useState(false)
  const meta = PLAN_META[planKey]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema) as Resolver<PlanFormValues>,
    defaultValues: {
      duration_label: plan?.duration_label ?? meta.duration,
      interval_days: plan?.interval_days ?? meta.interval,
      price: plan?.price ?? 0,
      compare_at_price: plan?.compare_at_price ?? null,
      discount_label: plan?.discount_label ?? '20% off',
      cadence_label: plan?.cadence_label ?? meta.cadence,
      badge: plan?.badge ?? '',
      image_url: plan?.image_url ?? '',
      checkout_url: plan?.checkout_url ?? '',
      sort_order: plan?.sort_order ?? meta.sort,
      is_active: plan?.is_active ?? true,
    },
  })

  async function onSave(data: PlanFormValues) {
    setSaving(true)
    const res = await fetch('/api/subscription-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(plan?.id ? { id: plan.id } : {}),
        site_id: siteId,
        plan_key: planKey,
        ...data,
        // Empty optional text → null to match the nullable columns.
        discount_label: data.discount_label || null,
        cadence_label: data.cadence_label || null,
        badge: data.badge || null,
        image_url: data.image_url || null,
        is_default: isDefault,
      }),
    })
    const result = await res.json()
    setSaving(false)
    if (!res.ok) toast.error('Save failed', { description: result.error })
    else toast.success(`${meta.duration} plan saved!`)
  }

  const isActive = watch('is_active')
  const imageUrl = watch('image_url') ?? ''

  return (
    <Card className={isDefault ? 'border-[#0F4A35] ring-1 ring-[#0F4A35]/20' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <RefreshCw size={15} style={{ color: '#0F4A35' }} />
          {meta.duration} — Subscribe &amp; Save
          {isDefault && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[#0F4A35] bg-[#0F4A35]/10 px-1.5 py-0.5 rounded-full">
              <Star size={9} className="fill-current" /> Default
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSave)} className="space-y-3">

          {/* Plan image */}
          <div className="space-y-1">
            <Label className="text-xs">Plan Image <span className="text-muted-foreground">(bottle shown on the Subscribe &amp; Save side)</span></Label>
            <ImageUploader
              currentUrl={imageUrl}
              folder={`${siteSlug}/subscriptions`}
              filename={planKey}
              onUploaded={(url) => setValue('image_url', url)}
              label="Upload Plan Image"
            />
            <Input {...register('image_url')} placeholder="or paste URL" className="h-7 text-xs font-mono mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Duration Label</Label>
              <Input {...register('duration_label')} placeholder="30 Days" className="h-8 text-sm" />
              {errors.duration_label && <p className="text-xs text-destructive">{errors.duration_label.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interval (days)</Label>
              <Input {...register('interval_days')} type="number" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Price ($)</Label>
              <Input {...register('price')} type="number" step="0.01" className="h-8 text-sm" />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Compare-at ($) <span className="text-muted-foreground">(strikethrough)</span></Label>
              <Input {...register('compare_at_price')} type="number" step="0.01" placeholder="32.99" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Discount Label</Label>
              <Input {...register('discount_label')} placeholder="20% off" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cadence Label</Label>
              <Input {...register('cadence_label')} placeholder="1 month" className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Checkout URL <span className="text-muted-foreground">(incl. ?selling_plan=…)</span></Label>
            <Input {...register('checkout_url')} placeholder="https://www.pharmaxalabs.com/cart/VARIANT:1?selling_plan=ID" className="h-8 text-sm font-mono" />
            {errors.checkout_url && <p className="text-xs text-destructive">{errors.checkout_url.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Badge <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register('badge')} placeholder="Best Value" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort Order</Label>
              <Input {...register('sort_order')} type="number" className="h-8 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={v => { if (v) onMakeDefault() }} />
              <Label className="text-xs cursor-pointer">Default plan</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
              <Label className="text-xs cursor-pointer">Active</Label>
            </div>
          </div>

          <Button type="submit" size="sm" className="w-full text-white text-xs font-semibold mt-1"
            style={{ background: '#0F4A35' }} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Save size={13} className="mr-1.5" />}
            Save Plan
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
