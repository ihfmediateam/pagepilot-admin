import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Package2, ChevronRight, Globe, AlertCircle } from 'lucide-react'
import type { Site } from '@/lib/types'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const admin = createServiceClient()

  const [{ data: sites }, { data: packages }] = await Promise.all([
    admin.from('sites').select('*').order('product_name'),
    admin.from('packages').select('id, site_id, label, price, is_active').eq('is_active', true),
  ])

  if (!sites) return notFound()

  const packagesBySite = (packages ?? []).reduce<Record<string, typeof packages>>((acc, pkg) => {
    if (!acc[pkg.site_id]) acc[pkg.site_id] = []
    acc[pkg.site_id]!.push(pkg)
    return acc
  }, {})

  const activeSites = (sites as Site[]).filter(s => s.is_active)
  const inactiveSites = (sites as Site[]).filter(s => !s.is_active)

  function SiteRow({ site }: { site: Site }) {
    const pkgs = packagesBySite[site.id] ?? []
    return (
      <Link href={`/sites/${site.slug}/packages`}
        className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#0F4A35]/40 hover:shadow-sm transition-all">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#7c3aed' }}>
          <Package2 size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{site.product_name}</p>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{site.slug}</span>
          </div>
          {pkgs.length === 0 ? (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle size={10} /> No packages configured
            </p>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {pkgs.map(pkg => (
                <span key={pkg.id} className="text-[10px] bg-purple-50 text-purple-700 font-medium px-1.5 py-0.5 rounded-full">
                  {pkg.label} — ${pkg.price}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#0F4A35] transition-colors shrink-0" />
      </Link>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed' }}>
          <Package2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing & Packages</h1>
          <p className="text-sm text-gray-500">Select a site to manage its packages and upsells</p>
        </div>
      </div>

      {/* Flow breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
        <Package2 size={11} className="text-purple-600" />
        <span className="font-semibold text-gray-600">Pricing</span>
        <ChevronRight size={11} />
        <span>Select Site</span>
        <ChevronRight size={11} />
        <span>Manage Packages</span>
      </div>

      {activeSites.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Active Sites</p>
          {activeSites.map(site => <SiteRow key={site.id} site={site} />)}
        </div>
      )}

      {inactiveSites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Inactive Sites</p>
          {inactiveSites.map(site => (
            <div key={site.id} className="opacity-50"><SiteRow site={site} /></div>
          ))}
        </div>
      )}

      {sites.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Package2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sites found. Add a site first.</p>
        </div>
      )}
    </div>
  )
}
