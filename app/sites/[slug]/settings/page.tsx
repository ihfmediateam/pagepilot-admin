import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getDeployRuns } from '@/lib/actions/deploy'
import DeployButton from '@/components/sites/DeployButton'
import SiteSettingsForm from '@/components/sites/SiteSettingsForm'
import DeployHistory from '@/components/sites/DeployHistory'

type Props = { params: Promise<{ slug: string }> }

export default async function SettingsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: site } = await supabase.from('sites').select('*').eq('slug', slug).single()
  if (!site) notFound()

  const runs = site.github_repo ? await getDeployRuns(site.github_repo) : []

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft size={15} className="mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{site.product_name}</h1>
            <p className="text-sm text-muted-foreground">Settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/sites/${slug}/packages`}>
            <Button variant="outline" size="sm">Edit Pricing</Button>
          </Link>
          <DeployButton githubRepo={site.github_repo} />
        </div>
      </div>

      <SiteSettingsForm site={site} />
      <DeployHistory runs={runs} />
    </div>
  )
}
