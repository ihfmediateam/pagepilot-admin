'use server'

export async function triggerDeploy(githubRepo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'supabase-pricing-update',
          client_payload: { source: 'pagepilot-admin' },
        }),
      }
    )
    if (res.status === 204) return { ok: true }
    const text = await res.text()
    return { ok: false, error: `GitHub responded ${res.status}: ${text}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function getDeployRuns(githubRepo: string) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/runs?per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        next: { revalidate: 30 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.workflow_runs ?? []
  } catch {
    return []
  }
}
