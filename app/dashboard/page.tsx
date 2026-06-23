import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getDeployRuns } from '@/lib/actions/deploy'
import Link from 'next/link'
import {
  Globe, Tag, Package2, Zap, ChevronRight, Plus,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle,
  ExternalLink, Info, RefreshCw,
} from 'lucide-react'
import type { Site, SaleEvent, GitHubRun } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

type SaleStatus = 'live' | 'scheduled' | 'ended' | 'paused'
function getSaleStatus(e: SaleEvent): SaleStatus {
  const now = Date.now()
  const start = new Date(e.starts_at).getTime()
  const end = new Date(e.ends_at).getTime()
  if (!e.is_active) return 'paused'
  if (now < start) return 'scheduled'
  if (now > end) return 'ended'
  return 'live'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (isNaN(ms) || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function RunStatusBadge({ run }: { run: GitHubRun }) {
  if (run.status === 'in_progress' || run.status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Loader2 size={9} className="animate-spin" /> Running
      </span>
    )
  }
  if (run.conclusion === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 size={9} /> Success
      </span>
    )
  }
  if (run.conclusion === 'failure') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        <XCircle size={9} /> Failed
      </span>
    )
  }
  if (run.conclusion === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        <XCircle size={9} /> Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      <Clock size={9} /> {run.status}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createServiceClient()

  const [{ data: sites }, { data: events }, { data: packages }] = await Promise.all([
    supabase.from('sites').select('*').order('product_name'),
    admin.from('sale_events').select('id, site_id, name, starts_at, ends_at, is_active').order('starts_at', { ascending: false }),
    admin.from('packages').select('id, site_id, is_active'),
  ])

  const allSites: Site[] = sites ?? []
  const allEvents: SaleEvent[] = (events ?? []) as SaleEvent[]
  const allPackages = packages ?? []

  // Stats
  const activeSites = allSites.filter(s => s.is_active).length
  const liveSales = allEvents.filter(e => getSaleStatus(e) === 'live').length
  const scheduledSales = allEvents.filter(e => getSaleStatus(e) === 'scheduled').length
  const totalPackages = allPackages.filter(p => p.is_active).length

  const liveSiteIds = new Set(allEvents.filter(e => getSaleStatus(e) === 'live').map(e => e.site_id))
  const packageSiteIds = new Set(allPackages.filter(p => p.is_active).map(p => p.site_id))

  // Fetch GitHub Actions runs for all sites in parallel
  const sitesWithRepo = allSites.filter(s => s.github_repo)
  const runsPerSite = await Promise.all(
    sitesWithRepo.map(async site => ({
      site,
      runs: (await getDeployRuns(site.github_repo!)) as GitHubRun[],
    }))
  )

  // Flatten + sort all runs newest-first
  const allRuns: Array<{ run: GitHubRun; site: Site }> = runsPerSite
    .flatMap(({ site, runs }) => runs.map(run => ({ run, site })))
    .sort((a, b) => new Date(b.run.created_at).getTime() - new Date(a.run.created_at).getTime())
    .slice(0, 10)

  // ── Issues ────────────────────────────────────────────────────────────────
  type Issue = { level: 'error' | 'warn' | 'info'; title: string; desc: string; href: string }
  const issues: Issue[] = []

  // Failed / cancelled deploys in last 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  for (const { run, site } of allRuns) {
    if (new Date(run.created_at).getTime() < cutoff) continue
    if (run.conclusion === 'failure') {
      issues.push({
        level: 'error',
        title: `Deploy failed — ${site.product_name}`,
        desc: `${run.name} · ${timeAgo(run.created_at)}`,
        href: run.html_url,
      })
    }
    if (run.conclusion === 'cancelled') {
      issues.push({
        level: 'warn',
        title: `Deploy cancelled — ${site.product_name}`,
        desc: `${run.name} · ${timeAgo(run.created_at)}`,
        href: run.html_url,
      })
    }
  }

  // Stale active sales (ended but still is_active = true)
  for (const ev of allEvents) {
    if (ev.is_active && getSaleStatus(ev) === 'ended') {
      const site = allSites.find(s => s.id === ev.site_id)
      issues.push({
        level: 'warn',
        title: `Stale sale event — ${site?.product_name ?? ev.site_id}`,
        desc: `"${ev.name}" ended but is_active is still ON`,
        href: `/sites/${site?.slug}/sales`,
      })
    }
  }

  // Active sites with no packages
  for (const site of allSites.filter(s => s.is_active)) {
    if (!packageSiteIds.has(site.id)) {
      issues.push({
        level: 'warn',
        title: `No packages — ${site.product_name}`,
        desc: 'This site has no active packages configured',
        href: `/sites/${site.slug}/packages`,
      })
    }
  }

  // Active sites with no GitHub repo (can't deploy)
  for (const site of allSites.filter(s => s.is_active && !s.github_repo)) {
    issues.push({
      level: 'info',
      title: `No GitHub repo — ${site.product_name}`,
      desc: 'Deploy button won\'t work without a repo configured',
      href: `/sites/${site.slug}/settings`,
    })
  }

  const ISSUE_STYLE = {
    error: { bg: 'bg-red-50',    border: 'border-red-200',    icon: XCircle,       iconColor: 'text-red-500',    text: 'text-red-800'   },
    warn:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: AlertTriangle, iconColor: 'text-amber-500',  text: 'text-amber-800' },
    info:  { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: Info,          iconColor: 'text-blue-500',   text: 'text-blue-800'  },
  }

  return (
    <div className="max-w-6xl space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of all your PagePilot sites</p>
        </div>
        <Link href="/sites/new">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#0F4A35' }}>
            <Plus size={15} /> Add New Site
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sites',      value: allSites.length,  sub: `${activeSites} active`,     icon: Globe,    color: '#0F4A35', bg: '#f0fdf4', href: '/sites'   },
          { label: 'Live Sales',       value: liveSales,         sub: `${scheduledSales} scheduled`, icon: Zap,    color: '#16a34a', bg: '#dcfce7', href: '/sales'   },
          { label: 'Sale Events',      value: allEvents.length,  sub: 'across all sites',          icon: Tag,      color: '#2563eb', bg: '#eff6ff', href: '/sales'   },
          { label: 'Active Packages',  value: totalPackages,     sub: 'across all sites',          icon: Package2, color: '#7c3aed', bg: '#f5f3ff', href: '/pricing' },
        ].map(s => (
          <Link key={s.label} href={s.href}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon size={17} style={{ color: s.color }} />
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Issues + Sites row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Issues */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className={issues.some(i => i.level === 'error') ? 'text-red-500' : 'text-amber-500'} />
              <p className="text-sm font-bold text-gray-800">Issues</p>
            </div>
            {issues.length > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                issues.some(i => i.level === 'error') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {issues.length}
              </span>
            )}
          </div>
          <div className="p-3 space-y-2">
            {issues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={28} className="text-green-400 mb-2" />
                <p className="text-sm font-semibold text-gray-600">All clear!</p>
                <p className="text-xs text-gray-400 mt-0.5">No issues detected across your sites</p>
              </div>
            )}
            {issues.map((issue, i) => {
              const cfg = ISSUE_STYLE[issue.level]
              const Icon = cfg.icon
              return (
                <Link key={i} href={issue.href} target={issue.href.startsWith('http') ? '_blank' : undefined}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border} hover:opacity-80 transition-opacity`}>
                  <Icon size={13} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${cfg.text} truncate`}>{issue.title}</p>
                    <p className={`text-[10px] ${cfg.text} opacity-70 mt-0.5`}>{issue.desc}</p>
                  </div>
                  <ExternalLink size={11} className={`${cfg.iconColor} opacity-60 shrink-0 mt-0.5`} />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Sites quick list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Sites</p>
            <Link href="/sites" className="text-xs font-semibold hover:underline" style={{ color: '#0F4A35' }}>
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {allSites.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No sites yet</div>
            )}
            {allSites.slice(0, 5).map(site => (
              <Link key={site.id} href={`/sites/${site.slug}/sales`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: '#0F4A35' }}>
                  <Globe size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{site.product_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{site.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {liveSiteIds.has(site.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </span>
                  )}
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Deployments */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-gray-500" />
            <p className="text-sm font-bold text-gray-800">Latest Deployments</p>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">auto-refresh 30s</span>
          </div>
          {allRuns.some(({ run }) => run.status === 'in_progress' || run.status === 'queued') && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Loader2 size={9} className="animate-spin" /> In progress
            </span>
          )}
        </div>

        {allRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <RefreshCw size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No deployment history found.</p>
            <p className="text-xs mt-1">Deploy a site to see runs here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allRuns.map(({ run, site }, i) => (
              <div key={`${run.id}-${i}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">

                {/* Site badge */}
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: '#0F4A35' }}>
                  <Globe size={12} className="text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-gray-800 truncate">{site.product_name}</p>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">{site.slug}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="truncate max-w-[180px]">{run.name}</span>
                    <span>·</span>
                    <span>{timeAgo(run.created_at)}</span>
                    <span>·</span>
                    <span>{formatDuration(run.created_at, run.updated_at)}</span>
                  </div>
                </div>

                {/* Status */}
                <RunStatusBadge run={run} />

                {/* Link */}
                <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                  className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 ml-1">
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
