'use server'

export async function triggerDeploy(githubRepo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // GitHub answers a repository_dispatch with 204 even when NO workflow listens
    // for the event — so a repo missing its deploy workflow looks like a healthy
    // deploy while nothing ever builds. Verify a workflow exists before claiming success.
    const wfRes = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      }
    )

    if (wfRes.status === 404) {
      return {
        ok: false,
        error: `Repo "${githubRepo}" not found, or the GitHub token cannot access it.`,
      }
    }

    if (wfRes.ok) {
      const wf = (await wfRes.json()) as { workflows?: { state?: string }[] }
      const active = (wf.workflows ?? []).filter(w => w.state === 'active')
      if (active.length === 0) {
        return {
          ok: false,
          error: `"${githubRepo}" has no active GitHub Actions workflow, so the deploy event would be ignored. Add .github/workflows/supabase-deploy.yml to that repo.`,
        }
      }
    }

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
