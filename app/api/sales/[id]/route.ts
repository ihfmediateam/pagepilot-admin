import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'images'

function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    // Strip any cache-busting query (?v=…) so it resolves to the real storage path.
    return idx === -1 ? null : url.slice(idx + marker.length).split('?')[0]
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
      .select('banner_desktop_url, banner_mobile_url, label_image_desktop_url, label_image_mobile_url, label_icon_url, sale_prices(image_url_override, upsell_image_url)')
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
        event.label_icon_url,
      ]
      const prices = (event as Record<string, unknown>).sale_prices as { image_url_override?: string | null; upsell_image_url?: string | null }[] | undefined
      for (const sp of prices ?? []) {
        urls.push(sp.image_url_override, sp.upsell_image_url)
      }
      const paths = [...new Set(urls.map(pathFromUrl).filter((p): p is string => !!p))]

      if (paths.length > 0) {
        // These URLs are NOT necessarily exclusive to this sale event:
        //  • a sale that never overrode its upsell image stores the site's
        //    regular upsell image URL (see the fallback in POST /api/sales), and
        //  • an event copied from another sale/site points at that site's files.
        // Deleting them blindly would break live pages, so only remove files
        // that nothing else in the database still references.
        const [{ data: pkgs }, { data: ups }, { data: evts }, { data: sps }] = await Promise.all([
          supabase.from('packages').select('package_image_url'),
          supabase.from('upsells').select('image_url'),
          supabase.from('sale_events').select('banner_desktop_url, banner_mobile_url, label_image_desktop_url, label_image_mobile_url, label_icon_url'),
          supabase.from('sale_prices').select('image_url_override, upsell_image_url'),
        ])

        const referenced = new Set<string>()
        const keep = (u: string | null | undefined) => {
          const p = pathFromUrl(u)
          if (p) referenced.add(p)
        }
        for (const r of (pkgs ?? []) as { package_image_url: string | null }[]) keep(r.package_image_url)
        for (const r of (ups ?? []) as { image_url: string | null }[]) keep(r.image_url)
        for (const r of (evts ?? []) as Record<string, string | null>[]) {
          keep(r.banner_desktop_url); keep(r.banner_mobile_url)
          keep(r.label_image_desktop_url); keep(r.label_image_mobile_url)
          keep(r.label_icon_url)
        }
        for (const r of (sps ?? []) as Record<string, string | null>[]) {
          keep(r.image_url_override); keep(r.upsell_image_url)
        }

        const orphaned = paths.filter(p => !referenced.has(p))
        if (orphaned.length > 0) {
          supabase.storage.from(BUCKET).remove(orphaned).catch(() => {})
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
