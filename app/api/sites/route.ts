import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/sites — create a new site
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('sites')
      .insert([{
        product_name: body.product_name,
        slug: body.slug,
        github_repo: body.github_repo,
        gtm_id: body.gtm_id ?? null,
        ga_id: body.ga_id ?? null,
        is_active: body.is_active ?? true,
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
