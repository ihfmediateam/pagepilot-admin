'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Loader2, ImageIcon } from 'lucide-react'

type Props = {
  // Current URL in the form (used to delete old file + show preview)
  currentUrl: string
  // Supabase Storage folder path e.g. "colopril/packages"
  folder: string
  // Filename without extension e.g. "pack-1-bottle"
  filename: string
  // Called with the new CDN URL after a successful upload
  onUploaded: (newUrl: string) => void
  label?: string
}

export default function ImageUploader({ currentUrl, folder, filename, onUploaded, label = 'Upload Image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl)
  const [imgBroken, setImgBroken] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setUploading(true)
    setImgBroken(false)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    fd.append('filename', filename)
    if (currentUrl) fd.append('oldUrl', currentUrl)

    try {
      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error('Upload failed', { description: data.error })
      } else {
        // Add cache-buster so the browser loads the fresh image
        const freshUrl = `${data.url}?t=${Date.now()}`
        setPreviewUrl(freshUrl)
        onUploaded(data.url) // save clean URL (no cache-buster) to the form
        toast.success('Image uploaded!', { description: `Saved to ${data.path}` })
      }
    } catch (err) {
      toast.error('Upload error', { description: String(err) })
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      <div
        className="relative rounded-lg border overflow-hidden flex items-center justify-center cursor-pointer group"
        style={{ height: 100, background: '#f9fafb' }}
        onClick={() => !uploading && inputRef.current?.click()}
        title="Click to upload new image"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs">Uploading…</span>
          </div>
        ) : previewUrl && !imgBroken ? (
          <>
            <img
              src={previewUrl}
              alt={filename}
              className="h-full w-full object-contain transition-opacity group-hover:opacity-60"
              onError={() => setImgBroken(true)}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/60 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-medium">
                <Upload size={12} /> Replace
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <ImageIcon size={20} />
            <span className="text-xs">Click to upload</span>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
        style={{ color: '#0F4A35', borderColor: '#0F4A35' }}
      >
        {uploading
          ? <><Loader2 size={12} className="animate-spin" />Uploading…</>
          : <><Upload size={12} />{label}</>
        }
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
