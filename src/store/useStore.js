import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchAllProducts, isNumericSpec, isBooleanSpec, getSpecColumns } from '../services/dataService'
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
      loading: true,
      error: null,

      // Filters (not persisted)
      searchQuery: '',
      activeCategory: null,
      selectedBrands: [],
      priceRange: null,
      specFilters: {},
      rangeFilters: {},

      booleanFilters: {},

      // Comparison basket (not persisted)
      comparisonIds: [],

      // ── Multi-Project Manifest (persisted) ──
      projects: [],            // [{ id, name, items: [{ productId, quantity }] }]
      activeProjectId: null,   // which project the + buttons target

      // ══════════════════════════════════════
      // Actions — Data
      // ══════════════════════════════════════
      loadProducts: async () => {
        set({ loading: true, error: null })
        try {
          const products = await fetchAllProducts()
          set({ products, loading: false })
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // ══════════════════════════════════════
      // Actions — Filters
      // ══════════════════════════════════════
      setSearchQuery: (query) => set({ searchQuery: query }),

      setActiveCategory: (category) => set({
        activeCategory: category,
        selectedBrands: [],
        specFilters: {},
        rangeFilters: {},
        booleanFilters: {},
      }),

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
      getFilteredProducts: () => {
        const {
          products, searchQuery, activeCategory,
          selectedBrands, priceRange, specFilters, rangeFilters, booleanFilters,
        } = get()
        let filtered = products

        if (activeCategory) {
          const tables = getCategoryTables(activeCategory)
          filtered = filtered.filter(p => tables.includes(p.category))
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
          )
        }

        if (selectedBrands.length > 0) {
          filtered = filtered.filter(p => selectedBrands.includes(p.brand))
        }

        if (priceRange) {
          const [min, max] = priceRange
          filtered = filtered.filter(p => {
            if (p.price === null) return true
            return p.price >= min && p.price <= max
          })
        }

        for (const [specName, values] of Object.entries(specFilters)) {
          if (values && values.length > 0) {
            filtered = filtered.filter(p => {
              const spec = p.specs[specName]
              if (!spec || !spec.value) return false
              return values.includes(spec.raw)
            })
          }
        }

        for (const [specName, range] of Object.entries(rangeFilters)) {
          if (range) {
            const [min, max] = range
            filtered = filtered.filter(p => {
              const spec = p.specs[specName]
              if (!spec || spec.value === null) return true
              return spec.value >= min && spec.value <= max
            })
          }
        }

        for (const [specName, value] of Object.entries(booleanFilters)) {
          if (value !== null && value !== undefined) {
            filtered = filtered.filter(p => {
              const spec = p.specs[specName]
              if (!spec) return false
              return spec.value === value
            })
          }
        }

        return filtered
      },

      getAvailableBrands: () => {
        const { products, activeCategory } = get()
        const pool = activeCategory
          ? products.filter(p => getCategoryTables(activeCategory).includes(p.category))
          : products
        return [...new Set(pool.map(p => p.brand))].sort()
      },

      getPriceRange: () => {
        const { products, activeCategory } = get()
        const pool = activeCategory
          ? products.filter(p => getCategoryTables(activeCategory).includes(p.category))
          : products
        const prices = pool.map(p => p.price).filter(p => p !== null)
        if (prices.length === 0) return null
        return [Math.min(...prices), Math.max(...prices)]
      },

      getSpecMeta: () => {
        const { products, activeCategory } = get()
        if (!activeCategory) return { numeric: {}, categorical: {}, boolean: {} }

        const specCols = getSpecColumns(activeCategory)
        const pool = products.filter(p => getCategoryTables(activeCategory).includes(p.category))
        const numeric = {}
        const categorical = {}
        const boolean = {}

        for (const [col, label, type] of specCols) {
          if (type === 'numeric') {
            const values = pool
              .map(p => p.specs[col]?.value)
              .filter(v => v !== null && v !== undefined)
            if (values.length > 0) {
              numeric[col] = [Math.min(...values), Math.max(...values)]
            }
          } else if (type === 'boolean') {
            const trueCount = pool.filter(p => p.specs[col]?.value === true).length
            const falseCount = pool.filter(p => p.specs[col]?.value === false).length
            if (trueCount > 0 || falseCount > 0) {
              boolean[col] = { trueCount, falseCount }
            }
          } else {
            const values = [...new Set(
              pool.map(p => p.specs[col]?.raw).filter(v => v && v !== 'N/A')
            )].sort()
            if (values.length > 0) {
              categorical[col] = values
            }
          }
        }

        return { numeric, categorical, boolean }
      },
    }),
    {
      name: 'gearhub-projects',
      // Only persist project data — everything else is ephemeral
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
)

export default useStore
