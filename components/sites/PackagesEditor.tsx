'use client'

import { useState } from 'react'
import PackageForm from './PackageForm'
import type { Package, Upsell } from '@/lib/types'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const PACK_KEYS = ['pack-1', 'pack-3', 'pack-5'] as const

export type SiteBundle = {
  id: string
  slug: string
  product_name: string
  packages: Package[]
  upsells: Upsell[]
}

type Props = {
  siteId: string
  siteSlug: string
  packages: Package[]
  upsells: Upsell[]
  /** Other sites the user can copy pricing from (excludes the current site). */
  otherSites: SiteBundle[]
}

const findPkg = (list: Package[], key: string) => list.find(p => p.pack_key === key)
const findUpsell = (list: Upsell[], key: string) => list.find(u => u.pack_key === key)

export default function PackagesEditor({ siteId, siteSlug, packages, upsells, otherSites }: Props) {
  const [copyBundle, setCopyBundle] = useState<SiteBundle | null>(null)
  const [copyNonce, setCopyNonce] = useState(0)
  const [selectedId, setSelectedId] = useState('')

  function handleCopy(id: string) {
    setSelectedId(id)
    const bundle = otherSites.find(s => s.id === id)
    if (!bundle) return
    setCopyBundle(bundle)
    setCopyNonce(n => n + 1) // triggers reset() inside each PackageForm
    const pkgCount = bundle.packages.length
    const upsellCount = bundle.upsells.length
    toast.success(`Mapped pricing from ${bundle.product_name}`, {
      description: `${pkgCount} package${pkgCount === 1 ? '' : 's'} · ${upsellCount} upsell${upsellCount === 1 ? '' : 's'} — review and Save each card.`,
    })
  }

  return (
    <div>
      {/* Copy-from-another-site bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
          <Copy size={15} className="text-purple-600" />
          Copy pricing from
        </div>
        <select
          value={selectedId}
          onChange={e => handleCopy(e.target.value)}
          disabled={otherSites.length === 0}
          className="flex-1 h-9 text-sm rounded-md border border-gray-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-[#0F4A35]/30 disabled:opacity-50"
        >
          <option value="">
            {otherSites.length === 0 ? 'No other sites available' : 'Select a site to map its pricing…'}
          </option>
          {otherSites.map(s => (
            <option key={s.id} value={s.id}>
              {s.product_name} ({s.packages.length} pkg{s.packages.length === 1 ? '' : 's'})
            </option>
          ))}
        </select>
        {copyBundle && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium shrink-0">
            <Check size={13} /> Mapped from {copyBundle.product_name}
          </div>
        )}
      </div>

      {copyBundle && (
        <p className="text-xs text-amber-600 -mt-3 mb-4">
          Fields below were filled from <span className="font-semibold">{copyBundle.product_name}</span>{' '}
          (including checkout URLs &amp; images). Nothing is saved yet — review each card and click Save.
        </p>
      )}

      {/* 3-column grid of package/upsell cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PACK_KEYS.map(key => (
          <PackageForm
            key={key}
            siteId={siteId}
            siteSlug={siteSlug}
            packKey={key}
            pkg={findPkg(packages, key)}
            upsell={findUpsell(upsells, key)}
            copyPkg={copyBundle ? findPkg(copyBundle.packages, key) ?? null : null}
            copyUpsell={copyBundle ? findUpsell(copyBundle.upsells, key) ?? null : null}
            copyNonce={copyNonce}
          />
        ))}
      </div>
    </div>
  )
}
