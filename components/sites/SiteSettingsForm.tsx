'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Site } from '@/lib/types'
import { updateSite } from '@/lib/actions/sites'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

const schema = z.object({
  product_name: z.string().min(1, 'Required'),
  github_repo: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Format: org/repo'),
  gtm_id: z.string().optional(),
  ga_id: z.string().optional(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function SiteSettingsForm({ site }: { site: Site }) {
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      product_name: site.product_name ?? '',
      github_repo: site.github_repo ?? '',
      gtm_id: site.gtm_id ?? '',
      ga_id: site.ga_id ?? '',
      is_active: site.is_active ?? true,
    },
  })

  const isActive = watch('is_active')

  async function onSubmit(data: FormValues) {
    setSaving(true)
    const result = await updateSite(site.id, data)
    setSaving(false)
    if (result?.error) toast.error('Save failed', { description: result.error })
    else toast.success('Settings saved!')
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Site Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product Name</Label>
            <Input {...register('product_name')} />
            {errors.product_name && <p className="text-xs text-destructive">{errors.product_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Slug <span className="text-muted-foreground font-normal text-xs">(read-only)</span></Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1.5">{site.slug}</Badge>
              <span className="text-xs text-muted-foreground">Cannot be changed after creation</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>GitHub Repo</Label>
            <Input {...register('github_repo')} placeholder="org/repo-name" className="font-mono" />
            {errors.github_repo && <p className="text-xs text-destructive">{errors.github_repo.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GTM ID</Label>
              <Input {...register('gtm_id')} placeholder="GTM-XXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>GA ID</Label>
              <Input {...register('ga_id')} placeholder="G-XXXXXXXXXX" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
            <Label className="cursor-pointer">Site is Active</Label>
          </div>

          <Button type="submit" className="w-full text-white font-semibold"
            style={{ background: '#0F4A35' }} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
