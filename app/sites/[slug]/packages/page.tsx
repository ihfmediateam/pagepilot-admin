import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import PackagesEditor, { type SiteBundle } from '@/components/sites/PackagesEditor'
import SubscriptionPlansEditor from '@/components/sites/SubscriptionPlansEditor'
import DeployButton from '@/components/sites/DeployButton'
import type { Package, Site, SubscriptionPlan, Upsell } from '@/lib/types'

type Props = { params: Promise<{ slug: string }> }

// Always render fresh. The subscription_plans / cross-site data is fetched with
// the service-role client (no cookies), which Next.js would otherwise cache in
// the Data Cache — showing stale/empty plans after a save. force-dynamic opts
// every fetch in this route out of caching.
export const dynamic = 'force-dynamic'

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

  // Load every other site's packages/upsells so pricing can be copied across sites.
  const admin = createServiceClient()
  const [{ data: allSites }, { data: allPackages }, { data: allUpsells }] = await Promise.all([
    admin.from('sites').select('id, slug, product_name, is_active').order('product_name'),
    admin.from('packages').select('*'),
    admin.from('upsells').select('*'),
  ])

  const otherSites: SiteBundle[] = ((allSites ?? []) as Pick<Site, 'id' | 'slug' | 'product_name' | 'is_active'>[])
    .filter(s => s.id !== site.id)
    .map(s => ({
      id: s.id,
      slug: s.slug,
      product_name: s.product_name,
      packages: ((allPackages ?? []) as Package[]).filter(p => p.site_id === s.id),
      upsells: ((allUpsells ?? []) as Upsell[]).filter(u => u.site_id === s.id),
    }))
    // Only offer sites that actually have pricing to copy.
    .filter(s => s.packages.length > 0)

  // Subscribe & Save plans. The table may not exist yet — if the query errors
  // (e.g. relation missing), fall back to an empty list and flag it so the
  // section renders with a "create the table first" notice instead of crashing.
  const subsResult = await admin
    .from('subscription_plans')
    .select('*')
    .eq('site_id', site.id)
    .order('sort_order')
  const subscriptionPlans = (subsResult.data ?? []) as SubscriptionPlan[]
  const subsTableMissing = !!subsResult.error

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
          <Link href={`/sites/${slug}/sales`}>
            <Button variant="outline" size="sm">Sales</Button>
          </Link>
          <Link href={`/sites/${slug}/settings`}>
            <Button variant="outline" size="sm">Settings</Button>
          </Link>
          <DeployButton githubRepo={site.github_repo} />
        </div>
      </div>

      {/* Copy-from-site picker + 3-column grid of package/upsell cards */}
      <PackagesEditor
        siteId={site.id}
        siteSlug={slug}
        packages={(packages ?? []) as Package[]}
        upsells={(upsells ?? []) as Upsell[]}
        otherSites={otherSites}
      />

      <SubscriptionPlansEditor
        siteId={site.id}
        siteSlug={slug}
        plans={subscriptionPlans}
        tableMissing={subsTableMissing}
      />
    </div>
  )
}
