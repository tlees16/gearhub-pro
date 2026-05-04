export type ProductCategory =
  | 'cameras'
  | 'lenses'
  | 'lighting'
  | 'drones'
  | 'gimbals'
  | 'sd_cards'
  | 'lighting_accessories'
  | 'tripods'

export type Condition = 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'Poor'

export interface SpecValue {
  raw: string
  value: string | number | boolean
  label: string
}

export interface Product {
  id: string // composite "cameras-123"
  dbId: number
  category: ProductCategory
  name: string
  brand: string
  subcategory?: string
  price: number // B&H MSRP in USD
  url: string // B&H product URL
  image: string
  specs: Record<string, SpecValue>
  allSpecs: Record<string, unknown>
  baseModel?: string
  configLabel?: string
  variantLabel?: string | null
  variantGroup?: string | null
}

export interface RetailPrice {
  retailer: string
  price: number
  currency: string
  inStock: boolean
  url?: string
  scraped_at?: string
}

export interface UsedPrice {
  platform: string
  condition: Condition
  price_avg: number
  price_min?: number
  price_max?: number
  price_median?: number
  currency: string
  listing_count: number
  url?: string
  scraped_at?: string
}

export interface RentalEntry {
  id?: number
  platform: string
  daily_rate: number
  currency: string
  city?: string
  region?: string
  listing_url?: string
  listing_title?: string
  owner_name?: string
  is_rental_house: boolean
  available: boolean
  captured_at?: string
}

export interface VariantGroup {
  id: number
  name: string
  configLabel: string
  isCurrent: boolean
  retail: RetailPrice[]
  used: UsedPrice[]
}

export interface ProductPrices {
  retail: RetailPrice[]
  used: UsedPrice[]
  rental: RentalEntry[]
}

export interface CompatibleLens {
  id: string           // `lenses-${dbId}`
  dbId: number
  name: string
  brand: string
  msrp: number | null
  lowestPrice: number | null
  imageUrl: string | null
  lensMount: string | null
  focalLength: string | null
  maxAperture: string | null
  formatCoverage: string | null
}

export interface CompatibleLight {
  id: string           // `lighting-${dbId}`
  dbId: number
  name: string
  brand: string
  msrp: number | null
  lowestPrice: number | null
  imageUrl: string | null
  formFactor: string | null
}
