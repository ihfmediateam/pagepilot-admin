import type { GitHubRun } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

type Props = { runs: GitHubRun[] }

function RunStatus({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress' || status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
        <Loader2 size={11} className="animate-spin" />
        Running
      </span>
    )
  }
  if (conclusion === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
        <CheckCircle2 size={11} />
        Success
      </span>
    )
  }
  if (conclusion === 'failure' || conclusion === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
        <XCircle size={11} />
        {conclusion === 'cancelled' ? 'Cancelled' : 'Failed'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
      <Clock size={11} />
      {status}
    </span>
  )
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (isNaN(ms)) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function DeployHistory({ runs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Deployments</CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No deploy history found.</p>
        ) : (
          <div className="space-y-3">
            {runs.slice(0, 5).map(run => (
              <div key={run.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border">
                <div className="flex items-center gap-3 min-w-0">
                  <RunStatus status={run.status} conclusion={run.conclusion} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{run.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.created_at).toLocaleString()} ·{' '}
                      {formatDuration(run.created_at, run.updated_at)}
                      {run.event && <> · <Badge variant="outline" className="text-xs ml-1">{run.event}</Badge></>}
                    </p>
                  </div>
                </div>
                <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
