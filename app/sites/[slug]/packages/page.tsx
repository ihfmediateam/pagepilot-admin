import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import PackageForm from '@/components/sites/PackageForm'
import DeployButton from '@/components/sites/DeployButton'
import type { Package, Upsell } from '@/lib/types'

type Props = { params: Promise<{ slug: string }> }

const PACK_KEYS = ['pack-1', 'pack-3', 'pack-5'] as const

export default async function PackagesPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: site } = await supabase.from('sites').select('*').eq('slug', slug).single()
  if (!site) notFound()

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('site_id', site.id)

  const { data: upsells } = await supabase
    .from('upsells')
    .select('*')
    .eq('site_id', site.id)

  function getPkg(key: string): Package | undefined {
    return (packages ?? []).find(p => p.pack_key === key)
  }
  function getUpsell(key: string): Upsell | undefined {
    return (upsells ?? []).find(u => u.pack_key === key)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft size={15} className="mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{site.product_name}</h1>
            <p className="text-sm text-muted-foreground">Packages &amp; Upsells</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/sites/${slug}/settings`}>
            <Button variant="outline" size="sm">Settings</Button>
          </Link>
          <DeployButton githubRepo={site.github_repo} />
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PACK_KEYS.map(key => (
          <PackageForm
            key={key}
            siteId={site.id}
            siteSlug={slug}
            packKey={key}
            pkg={getPkg(key)}
            upsell={getUpsell(key)}
          />
        ))}
      </div>
    </div>
  )
}
