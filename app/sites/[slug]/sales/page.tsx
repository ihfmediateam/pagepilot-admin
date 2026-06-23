import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import DeployButton from '@/components/sites/DeployButton'
import SalesManager from '@/components/sites/SalesManager'
import type { Package, SaleEvent, Upsell } from '@/lib/types'

type Props = { params: Promise<{ slug: string }> }

export default async function SalesPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: site } = await supabase.from('sites').select('*').eq('slug', slug).single()
  if (!site) notFound()

  const admin = createServiceClient()

  const [{ data: events }, { data: packages }, { data: upsells }] = await Promise.all([
    admin.from('sale_events').select('*, sale_prices(*)').eq('site_id', site.id).order('starts_at', { ascending: false }),
    admin.from('packages').select('*').eq('site_id', site.id).eq('is_active', true).order('sort_order'),
    admin.from('upsells').select('*').eq('site_id', site.id).eq('is_active', true),
  ])

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
            <p className="text-sm text-muted-foreground">Sale Events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/sites/${slug}/packages`}>
            <Button variant="outline" size="sm">Packages</Button>
          </Link>
          <Link href={`/sites/${slug}/settings`}>
            <Button variant="outline" size="sm">Settings</Button>
          </Link>
          <DeployButton githubRepo={site.github_repo} />
        </div>
      </div>

      <SalesManager
        siteId={site.id}
        siteSlug={slug}
        sitePackages={(packages ?? []) as Package[]}
        siteUpsells={(upsells ?? []) as Upsell[]}
        events={(events ?? []) as SaleEvent[]}
      />
    </div>
  )
}
