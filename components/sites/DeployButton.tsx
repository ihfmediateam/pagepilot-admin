'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { triggerDeploy } from '@/lib/actions/deploy'
import { toast } from 'sonner'
import { Rocket, Loader2 } from 'lucide-react'

type Props = { githubRepo: string; size?: 'sm' | 'default' }

export default function DeployButton({ githubRepo, size = 'default' }: Props) {
  const [deploying, setDeploying] = useState(false)

  async function handleDeploy() {
    if (!githubRepo) {
      toast.error('No GitHub repo configured for this site.')
      return
    }
    setDeploying(true)
    const result = await triggerDeploy(githubRepo)
    setDeploying(false)
    if (result.ok) {
      toast.success('Deploy triggered! Takes ~2 minutes.', {
        description: `Workflow dispatched to ${githubRepo}`,
      })
    } else {
      toast.error('Deploy failed', { description: result.error })
    }
  }

  return (
    <Button
      onClick={handleDeploy}
      disabled={deploying}
      size={size}
      className="font-semibold text-black border-0"
      style={{ background: '#FDCE0E' }}
    >
      {deploying
        ? <><Loader2 size={14} className="animate-spin mr-1.5" />Deploying…</>
        : <><Rocket size={14} className="mr-1.5" />Deploy</>
      }
    </Button>
  )
}
