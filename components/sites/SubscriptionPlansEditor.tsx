'use client'

import { useState } from 'react'
import SubscriptionPlanForm, { type PlanKey } from './SubscriptionPlanForm'
import type { SubscriptionPlan } from '@/lib/types'
import { RefreshCw, Info } from 'lucide-react'

const PLAN_KEYS: PlanKey[] = ['sub-30', 'sub-45', 'sub-60']

type Props = {
  siteId: string
  siteSlug: string
  plans: SubscriptionPlan[]
  /** True when the subscription_plans table isn't in Supabase yet. */
  tableMissing?: boolean
}

export default function SubscriptionPlansEditor({ siteId, siteSlug, plans, tableMissing }: Props) {
  const byKey = (k: string) => plans.find(p => p.plan_key === k)

  // Exactly one plan is the default. Seed from whichever row has is_default,
  // else fall back to sub-30 (matches the design's pre-selected pill).
  const [defaultKey, setDefaultKey] = useState<PlanKey>(
    (plans.find(p => p.is_default)?.plan_key as PlanKey) ?? 'sub-30'
  )

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0F4A35' }}>
          <RefreshCw size={15} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Subscribe &amp; Save Plans</h2>
          <p className="text-sm text-muted-foreground">The subscription side of the package toggle (30 / 45 / 60-day intervals)</p>
        </div>
      </div>

      {tableMissing ? (
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">The <code className="font-mono">subscription_plans</code> table doesn&apos;t exist yet.</p>
            <p className="text-amber-700 mt-0.5">Create it in the Supabase SQL Editor first — then reload this page and the plans below will save.</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Info size={12} />
          Turning on “Default plan” for one card automatically clears it on the others when you save.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {PLAN_KEYS.map(key => (
          <SubscriptionPlanForm
            key={key}
            siteId={siteId}
            siteSlug={siteSlug}
            planKey={key}
            plan={byKey(key)}
            isDefault={defaultKey === key}
            onMakeDefault={() => setDefaultKey(key)}
          />
        ))}
      </div>
    </div>
  )
}
