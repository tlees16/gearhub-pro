'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Database, ArrowLeft, Building2, Plus, Trash2, ExternalLink,
  Search, CheckCircle2, XCircle, Loader2, Edit2, Check, X,
  Globe, MapPin, DollarSign, AlertCircle, Package
} from 'lucide-react'
import useStore from '../store/useStore'
import AuthModal from './auth/AuthModal'
import {
  getMyCompany, createCompany, updateCompany,
  getCompanyListings, upsertListing, updateListing, deleteListing,
} from '../services/partnerService'

const CURRENCIES = ['USD', 'GBP', 'AUD', 'CAD', 'NZD', 'EUR']
const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' }, { code: 'CA', name: 'Canada' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' }, { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' }, { code: 'OTHER', name: 'Other' },
]

// ─── Company profile setup form ───────────────────────────────────
function CompanySetupForm({ userId, onCreated }) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('US')
  const [currency, setCurrency] = useState('USD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const company = await createCompany(userId, {
        name: name.trim(),
        website_url: website.trim() || null,
        city: city.trim() || null,
        country,
        currency,
      })
      onCreated(company)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
          <Building2 size={24} className="text-indigo-400" />
        </div>
        <h2 className="text-2xl font-black mb-2">Set up your company</h2>
        <p className="text-[13px] text-zinc-500">
          This info appears on product pages next to your rates.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-5 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-[12px] text-red-400">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Company name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Apex Camera Rentals"
            required
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Website URL</label>
          <input
            type="url"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Los Angeles"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Country</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[13px] text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Currency for your rates</label>
          <div className="flex gap-2 flex-wrap">
            {CURRENCIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  currency === c
                    ? 'bg-indigo-600 text-white border border-indigo-500'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Create company profile
        </button>
      </form>
    </div>
  )
}

// ─── Add listing form ─────────────────────────────────────────────
function AddListingForm({ company, existingProductKeys, onAdded }) {
  const { products } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [rate, setRate] = useState('')
  const [listingUrl, setListingUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return products
      .filter(p => {
        const key = `${p.category}-${p.dbId}`
        if (existingProductKeys.has(key)) return false
        return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      })
      .slice(0, 8)
  }, [query, products, existingProductKeys])

  const handleSelect = (product) => {
    setSelected(product)
    setQuery(product.name)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected || !rate) return
    setSaving(true)
    setError(null)
    try {
      const listing = await upsertListing({
        company_id: company.id,
        product_table: selected.category,
        product_id: selected.dbId,
        daily_rate: parseFloat(rate),
        currency: company.currency,
        listing_url: listingUrl.trim() || null,
        available: true,
      })
      onAdded({ ...listing, _product: selected })
      setQuery('')
      setSelected(null)
      setRate('')
      setListingUrl('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5">
      <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2">
        <Plus size={14} className="text-indigo-400" />
        Add a listing
      </h3>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-[11px] text-red-400">
          <AlertCircle size={11} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Product search */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); if (selected && e.target.value !== selected.name) setSelected(null) }}
            placeholder="Search products by name or brand..."
            className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {results.length > 0 && !selected && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/60 overflow-hidden max-h-60 overflow-y-auto">
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-zinc-800 transition-colors"
                >
                  {p.image && (
                    <img src={p.image} alt={p.name} className="w-8 h-8 object-contain bg-zinc-950 rounded-lg shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{p.brand} · {p.category.replace('_', ' ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-950/30 border border-indigo-900/40 rounded-lg">
            <CheckCircle2 size={12} className="text-indigo-400 shrink-0" />
            <span className="text-[11px] text-indigo-300 truncate flex-1">{selected.name}</span>
            <button type="button" onClick={() => { setSelected(null); setQuery('') }}>
              <X size={11} className="text-zinc-500 hover:text-white" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Daily rate ({company.currency}) *
            </label>
            <input
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="e.g. 150"
              min="1"
              step="0.01"
              required
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Product listing URL
            </label>
            <input
              type="url"
              value={listingUrl}
              onChange={e => setListingUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !selected || !rate}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[12px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Add to listings
        </button>
      </form>
    </div>
  )
}

// ─── Listing row ───────────────────────────────────────────────────
function ListingRow({ listing, onToggle, onDelete, onUpdateUrl }) {
  const { products } = useStore()
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlValue, setUrlValue] = useState(listing.listing_url || '')
  const [saving, setSaving] = useState(false)

  const product = listing._product || products.find(
    p => p.category === listing.product_table && p.dbId === listing.product_id
  )

  const handleSaveUrl = async () => {
    setSaving(true)
    try {
      await onUpdateUrl(listing.id, urlValue.trim() || null)
      setEditingUrl(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      listing.available ? 'bg-zinc-950 border-zinc-800/60' : 'bg-zinc-950/50 border-zinc-900/60 opacity-60'
    }`}>
      {/* Product image */}
      <div className="w-10 h-10 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
        {product?.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={14} className="text-zinc-700" />
          </div>
        )}
      </div>

      {/* Product name */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white truncate">
          {product?.name || `${listing.product_table}-${listing.product_id}`}
        </p>
        <p className="text-[10px] text-zinc-500 capitalize">
          {listing.product_table.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Rate */}
      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold text-white tabular-nums">${listing.daily_rate}<span className="text-[10px] font-normal text-zinc-500">/day</span></p>
        <p className="text-[9px] text-zinc-600">{listing.currency}</p>
      </div>

      {/* URL */}
      <div className="shrink-0 w-36">
        {editingUrl ? (
          <div className="flex items-center gap-1">
            <input
              type="url"
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              placeholder="https://..."
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={handleSaveUrl} disabled={saving} className="p-1 text-emerald-400 hover:text-emerald-300">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            </button>
            <button onClick={() => { setEditingUrl(false); setUrlValue(listing.listing_url || '') }} className="p-1 text-zinc-500 hover:text-white">
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingUrl(true)}
            className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors w-full"
          >
            <Link2Icon size={10} className="shrink-0" />
            <span className="truncate">{listing.listing_url ? new URL(listing.listing_url).hostname : 'Add link'}</span>
          </button>
        )}
      </div>

      {/* Available toggle */}
      <button
        onClick={() => onToggle(listing.id, !listing.available)}
        title={listing.available ? 'Mark unavailable' : 'Mark available'}
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
          listing.available
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25'
            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/25'
        }`}
      >
        {listing.available ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(listing.id)}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/40 transition-all"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// Tiny icon used inline
const Link2Icon = ({ size, className }) => <ExternalLink size={size} className={className} />

// ─── Company header ────────────────────────────────────────────────
function CompanyHeader({ company, onEdit }) {
  return (
    <div className="flex items-center gap-4 p-5 bg-zinc-950 border border-zinc-800/60 rounded-2xl mb-6">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
        <Building2 size={20} className="text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-white">{company.name}</h2>
          {company.verified && (
            <span className="px-1.5 py-0.5 bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[9px] font-bold uppercase tracking-wide rounded-md">
              Verified
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
          {company.city && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {company.city}{company.country ? `, ${company.country}` : ''}
            </span>
          )}
          {company.website_url && (
            <a
              href={company.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
            >
              <Globe size={10} />
              {new URL(company.website_url).hostname}
            </a>
          )}
          <span className="flex items-center gap-1">
            <DollarSign size={10} />
            {company.currency}
          </span>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all"
      >
        <Edit2 size={11} />
        Edit
      </button>
    </div>
  )
}

// ─── Edit company modal ────────────────────────────────────────────
function EditCompanyModal({ company, onSave, onClose }) {
  const [name, setName] = useState(company.name)
  const [website, setWebsite] = useState(company.website_url || '')
  const [city, setCity] = useState(company.city || '')
  const [country, setCountry] = useState(company.country || 'US')
  const [currency, setCurrency] = useState(company.currency || 'USD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateCompany(company.id, {
        name: name.trim(),
        website_url: website.trim() || null,
        city: city.trim() || null,
        country,
        currency,
      })
      onSave(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X size={15} />
        </button>
        <h3 className="text-[15px] font-bold mb-5">Edit company</h3>
        {error && (
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-[11px] text-red-400">
            <AlertCircle size={11} /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} required
            placeholder="Company name"
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
          <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {CURRENCIES.map(c => (
              <button key={c} type="button" onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  currency === c ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}>{c}</button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[12px] font-medium rounded-xl border border-zinc-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[12px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main dashboard ────────────────────────────────────────────────
export default function PartnerDashboard() {
  const router = useRouter()
  const { user, openAuthModal } = useStore()

  const [company, setCompany] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const co = await getMyCompany(user.id)
      setCompany(co)
      if (co) {
        const items = await getCompanyListings(co.id)
        setListings(items)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleListingAdded = (listing) => {
    setListings(prev => [listing, ...prev])
  }

  const handleToggleAvailable = async (id, available) => {
    try {
      const updated = await updateListing(id, { available })
      setListings(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l))
    } catch (err) {
      console.error('toggle available:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this listing?')) return
    try {
      await deleteListing(id)
      setListings(prev => prev.filter(l => l.id !== id))
    } catch (err) {
      console.error('delete listing:', err)
    }
  }

  const handleUpdateUrl = async (id, url) => {
    const updated = await updateListing(id, { listing_url: url })
    setListings(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l))
  }

  const existingProductKeys = useMemo(
    () => new Set(listings.map(l => `${l.product_table}-${l.product_id}`)),
    [listings]
  )

  // ── Not signed in ───────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <header className="border-b border-zinc-900 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors">
              <Database size={15} className="text-indigo-400" />
              <span className="text-sm font-bold">GearHub<span className="text-indigo-400">Pro</span></span>
            </button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <Building2 size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-black mb-2">Partner Dashboard</h2>
            <p className="text-[13px] text-zinc-500 mb-6 max-w-xs mx-auto">
              Sign in to manage your rental listings on GearHub.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
            >
              Sign in
            </button>
            <p className="text-[11px] text-zinc-600 mt-4">
              <button onClick={() => router.push('/list-gear')} className="text-indigo-500 hover:text-indigo-400">
                Learn about the partner program
              </button>
            </p>
          </div>
        </div>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} hint="Sign in to access your partner dashboard." />}
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={24} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={24} className="text-red-400 mx-auto mb-3" />
          <p className="text-[13px] text-red-400">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-zinc-900 text-zinc-300 rounded-xl text-[12px] hover:bg-zinc-800 transition-colors">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 px-6 py-4 sticky top-0 z-10 bg-black/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-[12px]">
              <ArrowLeft size={12} />
              Search
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <h1 className="text-[13px] font-bold">Partner Dashboard</h1>
          </div>
          <button
            onClick={() => router.push('/list-gear')}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            About the program
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Company profile setup — first time */}
        {!company && (
          <CompanySetupForm userId={user.id} onCreated={(co) => { setCompany(co); setListings([]) }} />
        )}

        {/* Dashboard view */}
        {company && (
          <>
            <CompanyHeader company={company} onEdit={() => setShowEditCompany(true)} />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Active listings', value: listings.filter(l => l.available).length },
                { label: 'Total listings', value: listings.length },
                { label: 'With direct links', value: listings.filter(l => l.listing_url).length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black tabular-nums">{value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Add listing */}
            <div className="mb-6">
              <AddListingForm
                company={company}
                existingProductKeys={existingProductKeys}
                onAdded={handleListingAdded}
              />
            </div>

            {/* Listings table */}
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Your listings ({listings.length})
              </h3>

              {listings.length === 0 ? (
                <div className="text-center py-14 bg-zinc-950 border border-zinc-800/60 rounded-2xl">
                  <Package size={28} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-[13px] text-zinc-600">No listings yet.</p>
                  <p className="text-[11px] text-zinc-700 mt-1">Search for a product above to add your first listing.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {listings.map(listing => (
                    <ListingRow
                      key={listing.id}
                      listing={listing}
                      onToggle={handleToggleAvailable}
                      onDelete={handleDelete}
                      onUpdateUrl={handleUpdateUrl}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showEditCompany && (
        <EditCompanyModal
          company={company}
          onSave={(updated) => { setCompany(updated); setShowEditCompany(false) }}
          onClose={() => setShowEditCompany(false)}
        />
      )}
    </div>
  )
}
