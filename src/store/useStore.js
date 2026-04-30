import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// SSR-safe localStorage wrapper — Zustand persist runs during Next.js SSR,
// where localStorage is not defined. This guard prevents the crash.
const ssrSafeStorage = createJSONStorage(() =>
  typeof window !== 'undefined'
    ? localStorage
    : { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
)
import { fetchAllProducts, fetchLowestRetailPrices, fetchLowestUsedPrices, fetchLowestRentalRates, fetchRetailerCounts, isNumericSpec, isBooleanSpec, getSpecColumns } from '../services/dataService'
import { onAuthStateChange, signOut as authSignOut } from '../services/auth'

// Maps nav category keys to the DB table names they include.
// Single-table categories map to themselves; 'accessories' groups multiple tables.
const CATEGORY_TABLES = {
  cameras:     ['cameras'],
  lenses:      ['lenses'],
  lighting:    ['lighting'],
  drones:      ['drones'],
  gimbals:     ['gimbals'],
  accessories: ['sd_cards', 'tripods', 'lighting_accessories'],
}
const getCategoryTables = (key) => CATEGORY_TABLES[key] || [key]

const CINEMA_LENS_RE = /\bT[0-9]|cine\b|cinema|\bPL\b|anamorphic|master\s*prime|signature\s*prime|summilux/i

// ─── Core filter engine ───────────────────────────────────────────
// Builds a filtered product pool from state, optionally skipping
// specific filter dimensions (for faceted navigation counts).
// skip is a Set of: 'category' | 'subcategory' | 'search' | 'brands' | 'price' | 'specs'
function buildFilteredPool(state, skip = new Set()) {
  const {
    products, searchQuery, activeCategory, activeSubcategory,
    selectedBrands, priceRange, specFilters, rangeFilters, booleanFilters,
  } = state

  let filtered = products

  if (!skip.has('category') && activeCategory) {
    filtered = filtered.filter(p => getCategoryTables(activeCategory).includes(p.category))
  }

  if (!skip.has('subcategory') && activeSubcategory) {
    if (activeCategory === 'accessories') {
      filtered = filtered.filter(p => p.category === activeSubcategory)
    } else if (activeCategory === 'lenses' && activeSubcategory === 'Cinema') {
      filtered = filtered.filter(p => CINEMA_LENS_RE.test(p.name))
    } else if (activeCategory === 'lenses' && activeSubcategory === 'Photo') {
      filtered = filtered.filter(p => !CINEMA_LENS_RE.test(p.name))
    } else {
      filtered = filtered.filter(p => p.subcategory === activeSubcategory)
    }
  }

  if (!skip.has('search') && searchQuery?.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    )
  }

  if (!skip.has('brands') && selectedBrands.length > 0) {
    filtered = filtered.filter(p => selectedBrands.includes(p.brand))
  }

  if (!skip.has('price') && priceRange) {
    const [min, max] = priceRange
    filtered = filtered.filter(p => p.price == null || (p.price >= min && p.price <= max))
  }

  if (!skip.has('specs')) {
    for (const [specName, values] of Object.entries(specFilters)) {
      if (values?.length > 0) {
        filtered = filtered.filter(p => {
          const spec = p.specs[specName]
          return spec?.value != null && values.includes(spec.raw)
        })
      }
    }
    for (const [specName, range] of Object.entries(rangeFilters)) {
      if (range) {
        const [rMin, rMax] = range
        filtered = filtered.filter(p => {
          const v = p.specs[specName]?.value
          return v == null || (v >= rMin && v <= rMax)
        })
      }
    }
    for (const [specName, value] of Object.entries(booleanFilters)) {
      if (value != null) {
        filtered = filtered.filter(p => p.specs[specName]?.value === value)
      }
    }
  }

  return filtered
}

let _idCounter = Date.now()
const uid = () => `proj_${_idCounter++}`

const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      authReady: false,
      authModalOpen: false,

      initAuth: () => {
        const unsub = onAuthStateChange((user) => {
          set({ user, authReady: true })
        })
        return unsub
      },

      signOut: async () => {
        await authSignOut()
        set({ user: null })
      },

      openAuthModal: () => set({ authModalOpen: true }),
      closeAuthModal: () => set({ authModalOpen: false }),

      // Data (not persisted — fetched fresh each load)
      products: [],
      lowestPrices: {},       // { [productKey]: lowestRetailPrice }
      lowestUsedPrices: {},   // { [productKey]: lowestUsedPrice }
      lowestRentalRates: {},  // { [productKey]: lowestDailyRate } — for user's currency
      retailerCounts: {},     // { [productKey]: distinctRetailerCount } from market_data
      userCountry: null,      // ISO country code from IP geo
      loading: true,
      error: null,

      // Filters (not persisted)
      searchQuery: '',
      activeCategory: null,
      activeSubcategory: null,
      selectedBrands: [],
      priceRange: null,
      specFilters: {},
      rangeFilters: {},
      booleanFilters: {},

      // Comparison basket (not persisted)
      comparisonIds: [],
      comparisonModalOpen: false,

      // UI overlays (not persisted)
      conciergeOpen: false,
      searchDrawerOpen: false,

      // ── Multi-Project Manifest (persisted) ──
      projects: [],            // [{ id, name, items: [{ productId, quantity }] }]
      activeProjectId: null,   // which project the + buttons target

      // ══════════════════════════════════════
      // Actions — Data
      // ══════════════════════════════════════
      loadProducts: async () => {
        const CACHE_KEY = 'gearhub_products_v3'
        const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
        const COUNTRY_TO_CURRENCY = { US:'USD', GB:'GBP', AU:'AUD', IN:'INR', CA:'CAD', NZ:'NZD' }

        // Helper: fetch fresh data, cache it, update store
        const fetchFresh = async ({ showLoading = true } = {}) => {
          if (showLoading) set({ loading: true, error: null })
          try {
            const [products, lowestPrices, lowestUsedPrices, retailerCounts] = await Promise.all([
              fetchAllProducts(),
              fetchLowestRetailPrices(),
              fetchLowestUsedPrices(),
              fetchRetailerCounts(),
            ])
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products, lowestPrices, lowestUsedPrices, retailerCounts }))
            } catch (_) {} // quota exceeded — silently skip caching
            set({ products, lowestPrices, lowestUsedPrices, retailerCounts, loading: false })
          } catch (err) {
            if (showLoading) set({ error: err.message, loading: false })
          }

          // Geo + rental load non-blocking (doesn't hold up the UI)
          fetch('https://ipapi.co/json/')
            .then(r => r.json()).catch(() => ({}))
            .then(geo => {
              const userCountry  = geo?.country_code || null
              const userCurrency = COUNTRY_TO_CURRENCY[userCountry] || 'USD'
              set({ userCountry })
              return fetchLowestRentalRates(userCurrency)
            })
            .then(lowestRentalRates => set({ lowestRentalRates }))
            .catch(() => {})
        }

        // Try to serve from cache first for instant load
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
          if (cached && Date.now() - cached.ts < CACHE_TTL) {
            set({ products: cached.products, lowestPrices: cached.lowestPrices, lowestUsedPrices: cached.lowestUsedPrices, retailerCounts: cached.retailerCounts || {}, loading: false })
            // Refresh in background — user sees content immediately
            fetchFresh({ showLoading: false })
            return
          }
        } catch (_) {} // corrupt cache — fall through to full fetch

        await fetchFresh({ showLoading: true })
      },

      // ══════════════════════════════════════
      // Actions — Filters
      // ══════════════════════════════════════
      setSearchQuery: (query) => set({ searchQuery: query }),

      setActiveCategory: (category) => set({
        activeCategory: category,
        activeSubcategory: null,
        selectedBrands: [],
        specFilters: {},
        rangeFilters: {},
        booleanFilters: {},
      }),

      setActiveSubcategory: (sub) => set({ activeSubcategory: sub }),

      toggleBrand: (brand) => set((state) => ({
        selectedBrands: state.selectedBrands.includes(brand)
          ? state.selectedBrands.filter(b => b !== brand)
          : [...state.selectedBrands, brand],
      })),

      setPriceRange: (range) => set({ priceRange: range }),

      setSpecFilter: (specName, values) => set((state) => ({
        specFilters: { ...state.specFilters, [specName]: values },
      })),

      setRangeFilter: (specName, range) => set((state) => ({
        rangeFilters: { ...state.rangeFilters, [specName]: range },
      })),

      setBooleanFilter: (specName, value) => set((state) => ({
        booleanFilters: { ...state.booleanFilters, [specName]: value },
      })),

      clearAllFilters: () => set({
        searchQuery: '',
        activeCategory: null,
        activeSubcategory: null,
        selectedBrands: [],
        priceRange: null,
        specFilters: {},
        rangeFilters: {},
        booleanFilters: {},
      }),

      // ══════════════════════════════════════
      // Actions — Comparison
      // ══════════════════════════════════════
      toggleComparison: (id) => set((state) => ({
        comparisonIds: state.comparisonIds.includes(id)
          ? state.comparisonIds.filter(i => i !== id)
          : [...state.comparisonIds, id],
      })),

      clearComparison: () => set({ comparisonIds: [] }),
      openComparisonModal: () => set({ comparisonModalOpen: true }),
      closeComparisonModal: () => set({ comparisonModalOpen: false }),

      toggleConcierge: () => set((s) => ({ conciergeOpen: !s.conciergeOpen })),
      closeConcierge: () => set({ conciergeOpen: false }),
      openSearchDrawer: () => set({ searchDrawerOpen: true }),
      closeSearchDrawer: () => set({ searchDrawerOpen: false }),

      // ══════════════════════════════════════
      // Actions — Projects
      // ══════════════════════════════════════
      createProject: (name) => {
        const id = uid()
        set((state) => ({
          projects: [...state.projects, { id, name, items: [] }],
          activeProjectId: state.activeProjectId || id,
        }))
        return id
      },

      deleteProject: (id) => set((state) => {
        const projects = state.projects.filter(p => p.id !== id)
        const activeProjectId =
          state.activeProjectId === id
            ? (projects[0]?.id || null)
            : state.activeProjectId
        return { projects, activeProjectId }
      }),

      renameProject: (id, newName) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, name: newName } : p
        ),
      })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      // ── Item operations (project-scoped) ──
      addItemToProject: (projectId, productId) => set((state) => {
        const targetId = projectId || state.activeProjectId
        if (!targetId) return state
        return {
          projects: state.projects.map(proj => {
            if (proj.id !== targetId) return proj
            const existing = proj.items.find(i => i.productId === productId)
            if (existing) {
              return {
                ...proj,
                items: proj.items.map(i =>
                  i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
                ),
              }
            }
            return { ...proj, items: [...proj.items, { productId, quantity: 1 }] }
          }),
        }
      }),

      removeItemFromProject: (projectId, productId) => set((state) => ({
        projects: state.projects.map(proj =>
          proj.id === projectId
            ? { ...proj, items: proj.items.filter(i => i.productId !== productId) }
            : proj
        ),
      })),

      updateItemQuantity: (projectId, productId, quantity) => set((state) => ({
        projects: state.projects.map(proj => {
          if (proj.id !== projectId) return proj
          if (quantity <= 0) {
            return { ...proj, items: proj.items.filter(i => i.productId !== productId) }
          }
          return {
            ...proj,
            items: proj.items.map(i =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          }
        }),
      })),

      clearProjectItems: (projectId) => set((state) => ({
        projects: state.projects.map(proj =>
          proj.id === projectId ? { ...proj, items: [] } : proj
        ),
      })),

      // ── Derived helpers (project-scoped) ──
      isInActiveProject: (productId) => {
        const { projects, activeProjectId } = get()
        const proj = projects.find(p => p.id === activeProjectId)
        return proj ? proj.items.some(i => i.productId === productId) : false
      },

      getActiveProject: () => {
        const { projects, activeProjectId } = get()
        return projects.find(p => p.id === activeProjectId) || null
      },

      getProjectById: (id) => {
        return get().projects.find(p => p.id === id) || null
      },

      getProjectProducts: (projectId) => {
        const { projects, products } = get()
        const proj = projects.find(p => p.id === projectId)
        if (!proj) return []
        return proj.items.map(item => {
          const product = products.find(p => p.id === item.productId)
          return product ? { ...item, product } : null
        }).filter(Boolean)
      },

      getProjectStats: (projectId) => {
        const items = get().getProjectProducts(projectId)
        let totalPrice = 0
        let totalWatts = 0
        let totalWeight = 0

        for (const { product, quantity } of items) {
          if (product.price) totalPrice += product.price * quantity
          const watts = product.specs['Max Power (W)']
          if (watts?.value) totalWatts += watts.value * quantity
          const weight = product.specs['Weight']
          if (weight?.value) totalWeight += weight.value * quantity
        }

        return { totalPrice, totalWatts, totalWeight, itemCount: items.length }
      },

      getProjectConflicts: (projectId) => {
        const items = get().getProjectProducts(projectId)
        const conflicts = []
        const cameraMounts = []
        const lensMounts = []

        for (const { product } of items) {
          if (product.category === 'cameras') {
            const mount = product.specs['Lens Mount']
            if (mount?.value && mount.raw !== 'N/A') {
              cameraMounts.push({ name: product.name, mount: mount.raw })
            }
          }
          if (product.category === 'lenses') {
            const mount = product.specs['Mount']
            if (mount?.value && mount.raw !== 'N/A') {
              lensMounts.push({ name: product.name, mount: mount.raw })
            }
          }
        }

        const normalize = (m) => m.toLowerCase().replace(/[- ]/g, '').replace(/mount$/, '')

        for (const cam of cameraMounts) {
          for (const lens of lensMounts) {
            const camNorm = normalize(cam.mount)
            const lensNorm = normalize(lens.mount)
            if (!camNorm.includes(lensNorm) && !lensNorm.includes(camNorm)) {
              conflicts.push({
                type: 'mount_mismatch',
                message: `Mount Mismatch: ${lens.name} (${lens.mount}) vs ${cam.name} (${cam.mount})`,
              })
            }
          }
        }

        return conflicts
      },

      // ══════════════════════════════════════
      // Derived — Filters
      // ══════════════════════════════════════

      // Full filter result — used for product grid
      getFilteredProducts: () => buildFilteredPool(get()),

      // Brands available given all active filters EXCEPT the brand filter itself.
      // Ensures brand list contracts to only brands present in the current subcategory/spec context.
      getAvailableBrands: () => {
        const pool = buildFilteredPool(get(), new Set(['brands']))
        return [...new Set(pool.map(p => p.brand))].sort()
      },

      // Per-brand product counts using the same faceted pool (excludes brand filter).
      getBrandCounts: () => {
        const pool = buildFilteredPool(get(), new Set(['brands']))
        const counts = {}
        for (const p of pool) counts[p.brand] = (counts[p.brand] || 0) + 1
        return counts
      },

      // Subcategory-counting pool: everything except subcategory filter.
      // Used to show how many products each subcategory has given brand/spec/price filters.
      getSubcategoryPool: () => buildFilteredPool(get(), new Set(['subcategory'])),

      getPriceRange: () => {
        // Use full category + subcategory pool (unaffected by price slider itself)
        const pool = buildFilteredPool(get(), new Set(['price', 'brands', 'specs']))
        const prices = pool.map(p => p.price).filter(p => p !== null)
        if (prices.length === 0) return null
        return [Math.min(...prices), Math.max(...prices)]
      },

      // Spec options/ranges computed from pool with all filters EXCEPT spec filters.
      // This means spec options reflect the current subcategory + brand selection,
      // rather than showing all possible values for the whole category.
      getSpecMeta: () => {
        const state = get()
        if (!state.activeCategory) return { numeric: {}, categorical: {}, boolean: {} }

        const specCols = getSpecColumns(state.activeCategory)
        const pool = buildFilteredPool(state, new Set(['specs']))
        const numeric = {}
        const categorical = {}
        const boolean = {}

        for (const [col, , type] of specCols) {
          if (type === 'numeric') {
            const values = pool.map(p => p.specs[col]?.value).filter(v => v != null)
            if (values.length > 0) numeric[col] = [Math.min(...values), Math.max(...values)]
          } else if (type === 'boolean') {
            const trueCount  = pool.filter(p => p.specs[col]?.value === true).length
            const falseCount = pool.filter(p => p.specs[col]?.value === false).length
            if (trueCount > 0 || falseCount > 0) boolean[col] = { trueCount, falseCount }
          } else {
            const values = [...new Set(
              pool.map(p => p.specs[col]?.raw).filter(v => v && v !== 'N/A')
            )].sort()
            if (values.length > 0) categorical[col] = values
          }
        }

        return { numeric, categorical, boolean }
      },
    }),
    {
      name: 'gearhub-projects',
      storage: ssrSafeStorage,
      // Only persist project data — everything else is ephemeral
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
)

export default useStore
