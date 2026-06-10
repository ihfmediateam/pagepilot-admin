import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'images'

// Extract storage path from a full Supabase CDN URL
// e.g. https://xxx.supabase.co/storage/v1/object/public/images/colopril/packages/pack-1-bottle.png
//   → colopril/packages/pack-1-bottle.png
function pathFromUrl(url: string): string | null {
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return url.slice(idx + marker.length)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null   // e.g. "colopril/packages"
    const filename = formData.get('filename') as string | null // e.g. "pack-1-bottle"
    const oldUrl = formData.get('oldUrl') as string | null

    if (!file || !folder || !filename) {
      return NextResponse.json({ error: 'Missing file, folder, or filename' }, { status: 400 })
    }

    // Determine extension from uploaded file
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const newPath = `${folder}/${filename}.${ext}`

    const supabase = createServiceClient()

    // 1. Upload new file (upsert so it overwrites same-name files)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 2. Delete old file if it exists and is different from the new path
    if (oldUrl) {
      const oldPath = pathFromUrl(oldUrl)
      if (oldPath && oldPath !== newPath) {
        // Fire-and-forget — don't block on delete errors
        supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {})
      }
    }

    // 3. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(newPath)

    return NextResponse.json({ url: publicUrl, path: newPath })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
