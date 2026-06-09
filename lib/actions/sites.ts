'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const siteSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  github_repo: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Format: org/repo'),
  gtm_id: z.string().optional(),
  ga_id: z.string().optional(),
  is_active: z.boolean().optional(),
})

export async function createSite(formData: FormData) {
  const raw = {
    product_name: formData.get('product_name') as string,
    slug: formData.get('slug') as string,
    github_repo: formData.get('github_repo') as string,
    gtm_id: formData.get('gtm_id') as string || undefined,
    ga_id: formData.get('ga_id') as string || undefined,
    is_active: true,
  }

  const parsed = siteSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('sites').insert([parsed.data])

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect(`/sites/${parsed.data.slug}/packages`)
}

export async function updateSite(siteId: string, data: {
  product_name: string
  github_repo: string
  gtm_id?: string
  ga_id?: string
  is_active: boolean
}) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('sites')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', siteId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}
