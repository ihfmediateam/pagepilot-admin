import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// PATCH /api/sites/[id] — update site settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('sites')
      .update({
        product_name: body.product_name,
        github_repo: body.github_repo,
        gtm_id: body.gtm_id ?? null,
        ga_id: body.ga_id ?? null,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
