import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/subscription-plans — upsert one Subscribe & Save plan.
// Enforces the "exactly one default per site" rule: when a plan is saved as the
// default, every other plan for that site is cleared first.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createServiceClient()

    if (body.is_default === true && body.site_id) {
      const clear = await supabase
        .from('subscription_plans')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('site_id', body.site_id)
        .neq('plan_key', body.plan_key)
      if (clear.error) return NextResponse.json({ error: clear.error.message }, { status: 400 })
    }

    const { error } = await supabase
      .from('subscription_plans')
      .upsert(
        { ...body, updated_at: new Date().toISOString() },
        { onConflict: 'site_id,plan_key' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
