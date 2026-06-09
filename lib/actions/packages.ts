'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Package, Upsell } from '@/lib/types'

export async function upsertPackage(pkg: Partial<Package> & { site_id: string; pack_key: string }) {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('packages')
    .upsert({ ...pkg, updated_at: new Date().toISOString() }, { onConflict: 'site_id,pack_key' })

  if (error) return { error: error.message }
  revalidatePath('/sites')
  return { ok: true }
}

export async function upsertUpsell(upsell: Partial<Upsell> & { site_id: string; pack_key: string }) {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('upsells')
    .upsert({ ...upsell, updated_at: new Date().toISOString() }, { onConflict: 'site_id,pack_key' })

  if (error) return { error: error.message }
  revalidatePath('/sites')
  return { ok: true }
}
