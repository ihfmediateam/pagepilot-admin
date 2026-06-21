'use client'

import Link from 'next/link'
import type { Site } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import DeployButton from './DeployButton'
import { ExternalLink, GitBranch, Tag, BarChart3, Settings } from 'lucide-react'

type Props = { site: Site }

export default function SiteCard({ site }: Props) {
  const liveUrl = `https://${site.slug}-killpage.ihfmediateam.workers.dev`

  return (
    <Card className="hover:shadow-md transition-shadow border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base leading-tight">{site.product_name || '—'}</h3>
            <Badge variant="secondary" className="mt-1 font-mono text-xs">
              {site.slug}
            </Badge>
          </div>
          <Badge
            className="shrink-0 text-xs"
            style={{
              background: site.is_active ? '#dcfce7' : '#fee2e2',
              color: site.is_active ? '#166534' : '#991b1b',
              border: 'none',
            }}
          >
            {site.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Meta info */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ExternalLink size={13} className="shrink-0" />
            <a href={liveUrl} target="_blank" rel="noopener noreferrer"
              className="hover:underline truncate text-xs font-mono"
              style={{ color: '#0F4A35' }}>
              {liveUrl}
            </a>
          </div>
          {site.github_repo && (
            <div className="flex items-center gap-2">
              <GitBranch size={13} className="shrink-0" />
              <span className="text-xs truncate">{site.github_repo}</span>
            </div>
          )}
          {site.gtm_id && (
            <div className="flex items-center gap-2">
              <Tag size={13} className="shrink-0" />
              <span className="text-xs">{site.gtm_id}</span>
            </div>
          )}
          {site.ga_id && (
            <div className="flex items-center gap-2">
              <BarChart3 size={13} className="shrink-0" />
              <span className="text-xs">{site.ga_id}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Link href={`/sites/${site.slug}/packages`}>
            <Button size="sm" className="text-white text-xs" style={{ background: '#0F4A35' }}>
              Edit Pricing
            </Button>
          </Link>
          <Link href={`/sites/${site.slug}/sales`}>
            <Button size="sm" variant="outline" className="text-xs">
              <Tag size={12} className="mr-1" />Sales
            </Button>
          </Link>
          <Link href={`/sites/${site.slug}/settings`}>
            <Button size="sm" variant="outline" className="text-xs">
              <Settings size={12} className="mr-1" />Settings
            </Button>
          </Link>
          <DeployButton githubRepo={site.github_repo} size="sm" />
        </div>
      </CardContent>
    </Card>
  )
}
