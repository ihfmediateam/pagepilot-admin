export type Site = {
  id: string
  slug: string
  product_name: string
  github_repo: string
  gtm_id: string
  ga_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Package = {
  id: string
  site_id: string
  pack_key: 'pack-1' | 'pack-3' | 'pack-5'
  label: string
  supply: string
  price: number
  list_price: number
  per_bottle: boolean
  free_shipping: boolean
  badge: string
  badge_label: string
  savings_label: string
  package_image_url: string
  checkout_url: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Upsell = {
  id: string
  site_id: string
  pack_key: string
  bottles: number
  title: string
  price_each: number
  original_total: number
  discounted_total: number
  image_url: string
  upsell_checkout_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type GitHubRun = {
  id: number
  created_at: string
  updated_at: string
  status: string
  conclusion: string | null
  html_url: string
  name: string
  event: string
}
