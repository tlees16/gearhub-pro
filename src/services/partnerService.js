import { supabase } from './supabase'

// ─── Company ─────────────────────────────────────────────────────

export async function getMyCompany(userId) {
  const { data, error } = await supabase
    .from('rental_companies')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message) // PGRST116 = no rows
  return data || null
}

export async function createCompany(userId, fields) {
  const slug = fields.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const { data, error } = await supabase
    .from('rental_companies')
    .insert({ user_id: userId, ...fields, slug })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCompany(id, fields) {
  const { data, error } = await supabase
    .from('rental_companies')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── Listings ─────────────────────────────────────────────────────

export async function getCompanyListings(companyId) {
  const { data, error } = await supabase
    .from('rental_listings')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertListing(listing) {
  const { data, error } = await supabase
    .from('rental_listings')
    .upsert({ ...listing, updated_at: new Date().toISOString() }, {
      onConflict: 'company_id,product_table,product_id',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateListing(id, fields) {
  const { data, error } = await supabase
    .from('rental_listings')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteListing(id) {
  const { error } = await supabase
    .from('rental_listings')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ─── Product page: partner listings for a specific product ────────

export async function fetchPartnerListings(productTable, productId) {
  const { data, error } = await supabase
    .from('rental_listings')
    .select(`
      id,
      daily_rate,
      currency,
      listing_url,
      available,
      rental_companies (
        id,
        name,
        website_url,
        city,
        country,
        currency,
        verified,
        active
      )
    `)
    .eq('product_table', productTable)
    .eq('product_id', productId)
    .eq('available', true)
    .order('daily_rate', { ascending: true })

  if (error) return []

  return (data || []).filter(row => row.rental_companies?.active)
}
