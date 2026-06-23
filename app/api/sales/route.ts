import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/sales — create or update a sale event + its sale_prices
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createServiceClient()

    const { id, sale_prices, ...eventFields } = body

    let eventId = id

    if (eventId) {
      // Update existing event
      const { error } = await supabase
        .from('sale_events')
        .update({ ...eventFields, updated_at: new Date().toISOString() })
        .eq('id', eventId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // Insert new event
      const { data, error } = await supabase
        .from('sale_events')
        .insert([{ ...eventFields, updated_at: new Date().toISOString() }])
        .select('id')
        .single()
      if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
      eventId = data.id
    }

    // Upsert sale_prices — delete existing first for clean sync
    if (Array.isArray(sale_prices)) {
      await supabase.from('sale_prices').delete().eq('sale_event_id', eventId)
      if (sale_prices.length > 0) {
        const rows = sale_prices.map((sp: Record<string, unknown>) => ({
          ...sp,
          sale_event_id: eventId,
        }))
        const { error: spErr } = await supabase.from('sale_prices').insert(rows)
        if (spErr) return NextResponse.json({ error: spErr.message }, { status: 500 })
      }
    }

    // Return the full event with sale_prices so the client can update state without a page reload
    const { data: saved } = await supabase
      .from('sale_events')
      .select('*, sale_prices(*)')
      .eq('id', eventId)
      .single()

    return NextResponse.json({ ok: true, id: eventId, event: saved })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
