import { createClient } from '@/lib/supabase/server'
import SiteCard from '@/components/sites/SiteCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Plus, Globe } from 'lucide-react'
import type { Site } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .order('product_name')

  const allSites: Site[] = sites ?? []

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allSites.length} site{allSites.length !== 1 ? 's' : ''} · {allSites.filter(s => s.is_active).length} active
          </p>
        </div>
        <Link href="/sites/new">
          <Button className="text-white font-semibold" style={{ background: '#0F4A35' }}>
            <Plus size={16} className="mr-1.5" />
            Add New Site
          </Button>
        </Link>
      </div>

      {/* Sites grid */}
      {allSites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Globe size={40} className="text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">No sites yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first kill page site to get started.</p>
          <Link href="/sites/new">
            <Button className="text-white" style={{ background: '#0F4A35' }}>
              <Plus size={16} className="mr-1.5" />
              Add New Site
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {allSites.map(site => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  )
}
