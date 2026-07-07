import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'images'

// Uploads were going straight to Storage at whatever size/format the admin's
// source file happened to be — sale banners and package-override photos have
// shown up at 2000-3200px / 1-1.5MB despite rendering at a few hundred px on
// the landing page, which measurably hurts mobile PageSpeed. Cap dimensions
// and re-compress (same format, so no content-type/extension mismatch) before
// every upload through this shared route.
const MAX_DIMENSION = 1920

type OptimizedImage = { buffer: Buffer; contentType: string; ext: string };

async function optimizeImage(buffer: Buffer, mimeType: string, originalExt: string): Promise<OptimizedImage> {
  // Formats sharp shouldn't touch: SVGs (vector, already tiny) and anything
  // not covered below (e.g. animated GIFs would lose animation on re-encode).
  if (mimeType === 'image/svg+xml') return { buffer, contentType: mimeType, ext: originalExt };

  try {
    const image = sharp(buffer, { animated: mimeType === 'image/gif' });
    const metadata = await image.metadata();
    const needsResize = (metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION;
    const resized = needsResize
      ? image.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      : image;

    // PNGs without transparency compress far better as JPEG — sharp's default
    // (non-palette) PNG re-encode can end up LARGER than the original for
    // typical flat-color marketing graphics. Only keep PNG when alpha must
    // be preserved, and even then use palette/quantized output.
    if (metadata.format === 'png' && !metadata.hasAlpha) {
      return { buffer: await resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), contentType: 'image/jpeg', ext: 'jpg' };
    }

    switch (metadata.format) {
      case 'jpeg':
        return { buffer: await resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), contentType: 'image/jpeg', ext: originalExt };
      case 'png':
        return { buffer: await resized.png({ quality: 85, palette: true }).toBuffer(), contentType: 'image/png', ext: originalExt };
      case 'webp':
        return { buffer: await resized.webp({ quality: 85 }).toBuffer(), contentType: 'image/webp', ext: originalExt };
      default:
        // Unrecognized/unsupported format for re-encoding — upload as-is.
        return { buffer, contentType: mimeType, ext: originalExt };
    }
  } catch {
    // Never let image processing block an upload — fall back to the original file.
    return { buffer, contentType: mimeType, ext: originalExt };
  }
}

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
    const originalExt = file.name.split('.').pop()?.toLowerCase() ?? 'png'

    const supabase = createServiceClient()

    // 1. Optimize (resize/re-encode may change the extension, e.g. opaque
    //    png -> jpg), THEN build the final path from the resolved extension.
    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const { buffer, contentType, ext } = await optimizeImage(rawBuffer, file.type, originalExt)
    const newPath = `${folder}/${filename}.${ext}`

    // 2. Upload new file (upsert so it overwrites same-name files)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 3. Delete old file if it exists and is different from the new path
    if (oldUrl) {
      const oldPath = pathFromUrl(oldUrl)
      if (oldPath && oldPath !== newPath) {
        // Fire-and-forget — don't block on delete errors
        supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {})
      }
    }

    // 4. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(newPath)

    return NextResponse.json({ url: publicUrl, path: newPath })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
