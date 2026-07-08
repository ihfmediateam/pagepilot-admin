import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'images'

function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    return idx === -1 ? null : url.slice(idx + marker.length)
  } catch {
    return null
  }
}

// DELETE /api/sales/[id] — delete a sale event and clean up its storage images
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    // Fetch all image URLs before deleting (cascade will remove sale_prices too)
    const { data: event } = await supabase
      .from('sale_events')
      .select('banner_desktop_url, banner_mobile_url, label_image_desktop_url, label_image_mobile_url, sale_prices(image_url_override, upsell_image_url)')
      .eq('id', id)
      .single()

    // Delete the event (CASCADE removes sale_prices rows)
    const { error } = await supabase.from('sale_events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Collect all referenced storage paths and delete them fire-and-forget
    if (event) {
      const urls: (string | null | undefined)[] = [
        event.banner_desktop_url,
        event.banner_mobile_url,
        event.label_image_desktop_url,
        event.label_image_mobile_url,
      ]
      const prices = (event as Record<string, unknown>).sale_prices as { image_url_override?: string | null; upsell_image_url?: string | null }[] | undefined
      for (const sp of prices ?? []) {
        urls.push(sp.image_url_override, sp.upsell_image_url)
      }
      const paths = urls.map(pathFromUrl).filter((p): p is string => !!p)
      if (paths.length > 0) {
        supabase.storage.from(BUCKET).remove(paths).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
