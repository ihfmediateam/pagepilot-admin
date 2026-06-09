'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewSitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    product_name: '',
    slug: '',
    github_repo: '',
    gtm_id: '',
    ga_id: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, product_name: name, slug: toSlug(name) }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.product_name.trim()) e.product_name = 'Required'
    if (!form.slug.trim()) e.slug = 'Required'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Lowercase letters, numbers, hyphens only'
    if (!form.github_repo.trim()) e.github_repo = 'Required'
    else if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(form.github_repo)) e.github_repo = 'Format: org/repo'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('sites').insert([{
      product_name: form.product_name,
      slug: form.slug,
      github_repo: form.github_repo,
      gtm_id: form.gtm_id || null,
      ga_id: form.ga_id || null,
      is_active: true,
    }])

    setLoading(false)
    if (error) {
      toast.error('Failed to create site', { description: error.message })
    } else {
      toast.success(`${form.product_name} created!`)
      router.push(`/sites/${form.slug}/packages`)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft size={15} className="mr-1" />Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Site</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Site details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input
                value={form.product_name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Colopril"
              />
              {errors.product_name && <p className="text-xs text-destructive">{errors.product_name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. colopril"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Used in the database and URLs. Auto-generated from name.</p>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>GitHub Repo *</Label>
              <Input
                value={form.github_repo}
                onChange={e => setForm(f => ({ ...f, github_repo: e.target.value }))}
                placeholder="ihfmediateam/colopril-cloudfare-pages"
                className="font-mono"
              />
              {errors.github_repo && <p className="text-xs text-destructive">{errors.github_repo}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>GTM ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={form.gtm_id}
                  onChange={e => setForm(f => ({ ...f, gtm_id: e.target.value }))}
                  placeholder="GTM-XXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label>GA ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={form.ga_id}
                  onChange={e => setForm(f => ({ ...f, ga_id: e.target.value }))}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-white font-semibold mt-2"
              style={{ background: '#0F4A35' }}
              disabled={loading}
            >
              {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              {loading ? 'Creating…' : 'Create Site'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Next steps guide */}
      <Card className="mt-4 border-dashed">
        <CardContent className="pt-5">
          <p className="text-sm font-medium mb-3 text-muted-foreground">After creating, you&apos;ll need to:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              'Site created in database ✓ (done automatically)',
              'Add packages and upsells on the next page',
              `Set NEXT_PUBLIC_SITE_SLUG=${form.slug || '[slug]'} in your repo's wrangler.toml`,
              'Connect repo to Cloudflare Workers',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
