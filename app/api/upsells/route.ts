import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/upsells — upsert an upsell
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('upsells')
      .upsert(
        { ...body, updated_at: new Date().toISOString() },
        { onConflict: 'site_id,pack_key' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
