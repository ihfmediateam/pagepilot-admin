export type Site = {
  id: string
  slug: string
  product_name: string
  github_repo: string | null
  gtm_id: string | null
  ga_id: string | null
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
  list_price: number | null
  per_bottle: boolean
  free_shipping: boolean
  badge: string
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

export type SalePrice = {
  id: string
  sale_event_id: string
  pack_key: string
  price: number | null
  list_price: number | null
  badge: string | null
  is_active: boolean
  // Display overrides (only applied during the sale window)
  label_override: string | null       // e.g. "6 Bottles" instead of "5 Bottles"
  supply_override: string | null      // e.g. "180-Day Supply"
  image_url_override: string | null   // optional alternate pack image
  show_upsell: boolean
  upsell_bottles: number | null
  upsell_title: string | null
  upsell_price_each: number | null
  upsell_original_total: number | null
  upsell_discounted_total: number | null
  upsell_image_url: string | null
  upsell_checkout_url: string | null
  checkout_url: string | null   // overrides the pack's regular checkout URL during the sale
}

export type SaleEvent = {
  id: string
  site_id: string
  name: string
  starts_at: string
  ends_at: string
  banner_desktop_url: string | null
  banner_mobile_url: string | null
  label_text: string | null
  label_image_desktop_url: string | null
  label_image_mobile_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  sale_prices?: SalePrice[]
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
