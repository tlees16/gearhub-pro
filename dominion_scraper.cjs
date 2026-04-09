#!/usr/bin/env node
/**
 * dominion_scraper.js
 * ───────────────────────────────────────────────────────────────────
 * Standalone B&H Photo scraper → Supabase populator.
 * Uses ZenRows Elite (js_render + premium_proxy + antibot) to bypass
 * bot detection, then writes product data + tech specs to Supabase.
 *
 * Required .env variables:
 *   SUPABASE_URL              https://lzkdewuwrshiqjjndszx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY eyJ...
 *   SUPABASE_DB_URL           postgresql://postgres:[password]@db.lzkdewuwrshiqjjndszx.supabase.co:5432/postgres
 *   ZENROWS_API_KEY           your_key_here
 *
 * Usage:
 *   node dominion_scraper.js              # all categories
 *   node dominion_scraper.js drones       # single category
 */
'use strict'

require('dotenv').config()
const axios   = require('axios')
const cheerio = require('cheerio')
const { createClient } = require('@supabase/supabase-js')
const { Client: PgClient } = require('pg')
const fs   = require('fs')
const path = require('path')

// ─── Validate environment ─────────────────────────────────────────────────────
const ENV = {
  SUPABASE_URL:   process.env.SUPABASE_URL,
  SUPABASE_KEY:   process.env.SUPABASE_SERVICE_ROLE_KEY,
  DB_URL:         process.env.SUPABASE_DB_URL,
  ZENROWS_KEY:    process.env.ZENROWS_API_KEY,
}
for (const [k, v] of Object.entries(ENV)) {
  if (!v) { console.error(`[FATAL] Missing .env variable: ${k}`); process.exit(1) }
}

// ─── Clients ──────────────────────────────────────────────────────────────────
// supabase client used for quick reads only; DDL goes through pg directly
const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY)

// ─── Logger ───────────────────────────────────────────────────────────────────
const LOG_FILE   = path.join(__dirname, 'scraper_log.txt')
const logStream  = fs.createWriteStream(LOG_FILE, { flags: 'a' })

function log(msg, level = 'INFO') {
  const line = `[${new Date().toISOString()}] [${level.padEnd(5)}] ${msg}`
  console.log(line)
  logStream.write(line + '\n')
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ZENROWS_API  = 'https://api.zenrows.com/v1/'
const BH_BASE      = 'https://www.bhphotovideo.com'
const CONCURRENCY  = 20      // ZenRows Elite concurrent request limit
const MAX_PAGES    = 100     // high cap — kit/bundle filter and skip-if-scraped keep costs in check
const MAX_RETRIES  = 3

// Every category table gets these base columns.
// Spec columns are added dynamically via ALTER TABLE.
const BASE_SCHEMA = `
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  brand       TEXT,
  price       NUMERIC(10,2),
  bhphoto_url TEXT UNIQUE,
  image_url   TEXT,
  subcategory TEXT,
  specs_json  JSONB,
  scraped_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
`

// ─── Category definitions ─────────────────────────────────────────────────────
// Add / remove start URLs as B&H reorganizes their taxonomy.
const ALL_CATEGORIES = [
  {
    key: 'cameras',
    table: 'cameras',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/digital-cameras/ci/9811',
    ],
  },
  {
    key: 'lenses',
    table: 'lenses',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/camera-lenses/ci/10946',
    ],
  },
  {
    key: 'lighting',
    table: 'lighting',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/continuous-lighting/ci/22442',
    ],
  },
  {
    key: 'drones',
    table: 'drones',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/drones-uas/ci/38509',
    ],
  },
  {
    key: 'gimbals',
    table: 'gimbals',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/camera-stabilizers-gimbals/ci/35095',
    ],
  },
  {
    key: 'sd_cards',
    table: 'sd_cards',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/sd-cards/ci/7727',
    ],
  },
  {
    key: 'lighting_accessories',
    table: 'lighting_accessories',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/lighting-studio-accessories/ci/22444',
    ],
  },
  {
    key: 'tripods',
    table: 'tripods',
    startUrls: [
      'https://www.bhphotovideo.com/c/browse/tripods-supports/ci/9108',
    ],
  },
]

// ─── Utilities ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Returns true if the product name looks like a kit, bundle, or multi-item set. */
function isKitOrBundle(name) {
  const KIT_PATTERNS = [
    /\bkit\b/i,                          // "Starter Kit", "Vlogging Kit", "2-Light Kit"
    /\bbundle\b/i,                       // "Basic Bundle", "with Bundle"
    /\bcombo\b/i,                        // "Camera Combo"
    /\bpackage\b/i,                      // "Value Package"
    /\bset\b/i,                          // "Lighting Set", "2-Light Set"
    /\bvlogg?(er|ing)?\b/i,             // "Vlogger", "Vlogging"
    /\bstarter\b/i,                      // "Starter Kit"
    /\b\d+[\s-]*(?:light|piece|pc)\b/i, // "2-Light", "3-Piece", "2PC"
    /\bwith\b.{1,40}\b\d+mm\b/i,        // "with 24-105mm Lens" (camera+lens kits)
    /\bwith\b.{1,40}\bf\/[\d.]+/i,      // "with f/1.8 Lens"
  ]
  return KIT_PATTERNS.some(re => re.test(name))
}

/**
 * Per-category reject patterns.
 * If a product name matches these patterns it doesn't belong in that category's
 * table — usually caused by B&H pagination bleeding into adjacent categories.
 */
const CATEGORY_REJECT = {
  drones:  /\b(tripod|monopod|ball\s*head|gimbal\s*head|beanbag|bean\s*bag|car\s*window|window\s*pod|window\s*mount|pan\s*head|fluid\s*head|tilt\s*head|video\s*head|suction\s*mount|clamp)\b/i,
  gimbals: /\b(tripod|monopod|beanbag|bean\s*bag|car\s*window|window\s*pod|window\s*mount)\b/i,
}

/** Convert any spec label to a safe Postgres column name. */
function toColName(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 63)  // Postgres column name limit
}

/** Infer a Postgres column type from a scraped string value.
 *  Only NUMERIC vs TEXT — boolean inference is too fragile for spec values
 *  (e.g. one product says "Yes", another says "Yes, Flash Only"). */
function inferType(value) {
  const v = value.trim()
  // Pure number, optionally with comma thousands separator
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(v) || /^\d+(\.\d+)?$/.test(v)) return 'NUMERIC'
  return 'TEXT'
}

/** Cast a raw string value to the inferred Postgres type. */
function normalizeValue(value, type) {
  const v = value.trim()
  if (type === 'NUMERIC') return parseFloat(v.replace(/,/g, ''))
  return v.slice(0, 1000)  // clamp very long text
}

// ─── ZenRows fetch ────────────────────────────────────────────────────────────
async function zrFetch(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log(`  Fetch [${attempt}/${MAX_RETRIES}]: ${url}`)
      const res = await axios.get(ZENROWS_API, {
        params: {
          url,
          apikey:         ENV.ZENROWS_KEY,
          js_render:      'true',
          premium_proxy:  'true',
          antibot:        'true',
          wait:           '1000',   // ms to wait after page JS settles
        },
        timeout: 120_000,
      })
      return res.data  // raw HTML string
    } catch (err) {
      const status = err.response?.status
      log(`  Fetch failed [${attempt}/${MAX_RETRIES}] (HTTP ${status ?? 'N/A'}): ${err.message}`, 'WARN')
      if (attempt < MAX_RETRIES) {
        const backoff = attempt * 20_000
        log(`  Backing off ${backoff / 1000}s...`, 'WARN')
        await sleep(backoff)
      }
    }
  }
  log(`  All retries exhausted: ${url}`, 'ERROR')
  return null
}

// ─── HTML: category listing page ──────────────────────────────────────────────
function extractProductLinks(html) {
  const $ = cheerio.load(html)
  const links = new Set()

  // Selector 1: B&H primary product title link attribute
  $('a[data-selenium="miniProductPage"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) links.add(href)
  })

  // Selector 2: any anchor whose href contains the /c/product/ or /p/ pattern
  $('a[href*="/c/product/"], a[href*="/p/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    // Filter out reviews, Q&A, wishlist, compare links
    if (/\/(c\/product|p\/[A-Z0-9]{5,})/.test(href) &&
        !/(review|forum|question|compare|wishlist)/i.test(href)) {
      links.add(href)
    }
  })

  const absolute = [...links].map(href =>
    href.startsWith('http') ? href : `${BH_BASE}${href}`
  )
  log(`  Found ${absolute.length} product links`)
  return absolute
}

function extractNextPageUrl(html, currentUrl) {
  const $ = cheerio.load(html)

  // Selector 1: explicit next-page links
  const nextSel = [
    'a[data-selenium="paginationNext"]',
    'a[aria-label="Next page"]',
    'a[aria-label*="Next"]',
    'a.next-page',
    'a[rel="next"]',
  ]
  for (const sel of nextSel) {
    const el = $(sel).first()
    if (el.length) {
      const href = el.attr('href')
      if (href) return href.startsWith('http') ? href : `${BH_BASE}${href}`
    }
  }

  // Fallback: increment ?pn= query param
  try {
    const url = new URL(currentUrl)
    const pn = parseInt(url.searchParams.get('pn') || '1', 10)
    url.searchParams.set('pn', pn + 1)
    return url.toString()
  } catch {
    return null
  }
}

// ─── HTML: product detail page ────────────────────────────────────────────────
function extractProductData(html) {
  const $ = cheerio.load(html)

  // ── Name ────────────────────────────────────────────────────────────────────
  const name = (
    $('h1[data-selenium="productTitle"]').text() ||
    $('h1.product-title').text() ||
    $('[class*="productTitle"]').first().text() ||
    $('h1').first().text()
  ).trim()

  // ── Brand ────────────────────────────────────────────────────────────────────
  const brand = (
    $('[data-selenium="productBrand"] a').text() ||
    $('[data-selenium="productBrand"]').text() ||
    $('a[href*="/c/brand/"]').first().text() ||
    $('span[itemprop="brand"]').text() ||
    $('[class*="brandName"]').first().text()
  ).trim() || (name ? name.split(' ')[0] : '')

  // ── Price ────────────────────────────────────────────────────────────────────
  let price = null

  // Attempt 1: JSON-LD structured data (most reliable — B&H always includes it)
  $('script[type="application/ld+json"]').each((_, el) => {
    if (price !== null) return
    try {
      const data = JSON.parse($(el).html())
      const offerPrice =
        data?.offers?.price ??
        (Array.isArray(data?.offers) ? data.offers[0]?.price : undefined)
      if (offerPrice != null) price = parseFloat(offerPrice)
    } catch { /* malformed JSON-LD, skip */ }
  })

  // Attempt 2: meta / itemprop attributes
  if (price === null) {
    const metaPrice =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[itemprop="price"]').attr('content') ||
      $('[itemprop="price"]').attr('content')
    if (metaPrice) price = parseFloat(metaPrice)
  }

  // Attempt 3: CSS selectors (fragile — B&H uses hashed classnames)
  if (price === null) {
    const priceSelectors = [
      '[data-selenium="pricingSection"] .price',
      '[data-selenium="regularPrice"]',
      '[data-selenium="salePrice"]',
      '.ph-price',
      '[class*="priceWrapper"] [class*="price"]',
      'span.price',
    ]
    for (const sel of priceSelectors) {
      const el = $(sel).first()
      const content = el.attr('content')
      if (content) { price = parseFloat(content); break }
      const text = el.text().replace(/[^0-9.]/g, '')
      if (text) { price = parseFloat(text); break }
    }
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  // Try selenium attrs first, then fall back to CDN URL pattern match
  let imageUrl = (
    $('[data-selenium="swatchImage"]').attr('src') ||
    $('[data-selenium="productImage"]').attr('src') ||
    $('img[itemprop="image"]').attr('src') ||
    $('[class*="productImage"] img').first().attr('src') ||
    $('img.primary-image').attr('src') ||
    ''
  )
  if (!imageUrl) {
    // B&H product images always live on static.bhphotovideo.com/c/products/
    $('img').each((_, el) => {
      if (imageUrl) return
      const src = $(el).attr('src') || ''
      if (src.includes('bhphotovideo.com/c/products') || src.includes('static.bhphoto')) {
        imageUrl = src
      }
    })
  }
  // JSON-LD image fallback
  if (!imageUrl) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (imageUrl) return
      try {
        const data = JSON.parse($(el).html())
        if (data?.image) imageUrl = Array.isArray(data.image) ? data.image[0] : data.image
      } catch { /* skip */ }
    })
  }

  // ── Subcategory from breadcrumb ───────────────────────────────────────────
  const breadcrumbs = []
  $('[data-selenium="breadCrumb"] a, nav[aria-label*="read"] a, .breadcrumb a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) breadcrumbs.push(t)
  })
  // Second-to-last crumb is typically the subcategory (last is the product name)
  const subcategory = breadcrumbs.length >= 2
    ? breadcrumbs[breadcrumbs.length - 2]
    : breadcrumbs[0] || ''

  // ── Specs ─────────────────────────────────────────────────────────────────
  const specs = {}

  // Attempt 1: <table> rows — most B&H spec tables use this
  $([
    'table tr',
    '.spec-table tr',
    '.specifications tr',
    '[data-selenium*="spec"] tr',
    '[class*="specBlock"] tr',
    '[class*="specification"] tr',
  ].join(', ')).each((_, row) => {
    const cells = $(row).find('td, th')
    if (cells.length >= 2) {
      const label = $(cells.eq(0)).text().trim().replace(/:$/, '')
      const value = $(cells.eq(1)).text().trim()
      if (label && value && label !== value && label.length < 100) {
        specs[label] = value
      }
    }
  })

  // Attempt 2: <dl> definition list format
  if (Object.keys(specs).length === 0) {
    $('dl dt').each((_, dt) => {
      const label = $(dt).text().trim().replace(/:$/, '')
      const value = $(dt).next('dd').text().trim()
      if (label && value) specs[label] = value
    })
  }

  // Attempt 3: generic adjacent label/value div patterns
  if (Object.keys(specs).length === 0) {
    $('[class*="spec"]').each((_, container) => {
      const label = $(container)
        .find('[class*="label"], [class*="key"], [class*="name"]')
        .first().text().trim().replace(/:$/, '')
      const value = $(container)
        .find('[class*="value"], [class*="data"], [class*="detail"]')
        .first().text().trim()
      if (label && value && label !== value && label.length < 100) {
        specs[label] = value
      }
    })
  }

  return { name, brand, price, imageUrl, subcategory, specs }
}

// ─── Database helpers ─────────────────────────────────────────────────────────

async function ensureTable(pg, table) {
  await pg.query(`CREATE TABLE IF NOT EXISTS "${table}" (${BASE_SCHEMA})`)

  // Backfill base columns missing from pre-existing tables with older schemas
  const baseColumns = [
    ['brand',        'TEXT'],
    ['price',        'NUMERIC(10,2)'],
    ['bhphoto_url',  'TEXT'],
    ['image_url',    'TEXT'],
    ['subcategory',  'TEXT'],
    ['specs_json',   'JSONB'],
    ['scraped_at',   'TIMESTAMPTZ'],
    ['created_at',   'TIMESTAMPTZ'],
  ]
  for (const [col, type] of baseColumns) {
    await pg.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${type}`)
  }

  // Ensure bhphoto_url has the unique index ON CONFLICT depends on
  await pg.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${table}_bhphoto_url_idx"
     ON "${table}" (bhphoto_url)`
  )

  log(`  Table ready: ${table}`)
}

// Per-process column cache to avoid redundant information_schema queries
const colCache = new Map()

async function ensureColumn(pg, table, colName, colType) {
  const key = `${table}.${colName}`
  if (colCache.has(key)) return

  const { rows } = await pg.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, colName]
  )

  if (rows.length === 0) {
    // Guard: colName was already sanitized by toColName(); colType is always
    // one of TEXT / NUMERIC / BOOLEAN — no user-controlled input reaches here.
    await pg.query(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${colName}" ${colType}`
    )
    log(`  + New column: ${table}."${colName}" ${colType}`)
  }
  colCache.set(key, true)
}

/** Load bhphoto_url values for products that have already been fully scraped.
 *  In fill-missing mode, excludes products with null image_url so they get re-scraped. */
async function loadScrapedUrls(pg, table, fillMissing = false) {
  try {
    const condition = fillMissing
      ? `scraped_at IS NOT NULL AND image_url IS NOT NULL AND specs_json IS NOT NULL AND specs_json != '{}'::jsonb`
      : `scraped_at IS NOT NULL`
    const { rows } = await pg.query(
      `SELECT bhphoto_url FROM "${table}" WHERE ${condition}`
    )
    return new Set(rows.map(r => r.bhphoto_url))
  } catch {
    return new Set()
  }
}

/** Dynamic UPSERT: builds INSERT … ON CONFLICT DO UPDATE from a plain object. */
async function upsertProduct(pg, table, record) {
  const cols = Object.keys(record)
  const vals = Object.values(record)
  const placeholders = vals.map((_, i) => `$${i + 1}`)
  const updates = cols
    .filter(c => c !== 'bhphoto_url')
    .map(c => `"${c}" = EXCLUDED."${c}"`)
    .join(', ')

  await pg.query(
    `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})
     VALUES (${placeholders.join(', ')})
     ON CONFLICT (bhphoto_url) DO UPDATE SET ${updates}`,
    vals
  )
}

// ─── Single-product scraper ───────────────────────────────────────────────────
async function scrapeOneProduct(pg, table, categoryKey, productUrl, scrapedUrls) {
  const productHtml = await zrFetch(productUrl)
  if (!productHtml) {
    log(`  FAIL: ${productUrl}`, 'WARN')
    return 0
  }

  const { name, brand, price, imageUrl, subcategory, specs } = extractProductData(productHtml)

  if (!name) {
    log(`  SKIP (no name parsed — selector mismatch?): ${productUrl}`, 'WARN')
    return 0
  }

  if (isKitOrBundle(name)) {
    log(`  SKIP (kit/bundle): ${name}`)
    return 0
  }

  const rejectRe = CATEGORY_REJECT[categoryKey]
  if (rejectRe && rejectRe.test(name)) {
    log(`  SKIP (wrong category for "${categoryKey}"): ${name}`)
    return 0
  }

  const sampleSpecs = Object.entries(specs).slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`).join(' | ')
  log(`  → ${name} | $${price ?? '?'} | ${Object.keys(specs).length} specs  [${sampleSpecs}]`)

  // Build spec sub-record, auto-migrating columns as needed
  const specRecord = {}
  for (const [rawLabel, rawValue] of Object.entries(specs)) {
    const colName = toColName(rawLabel)
    if (!colName || colName.length < 2) continue
    const colType = inferType(rawValue)
    try {
      await ensureColumn(pg, table, colName, colType)
      specRecord[colName] = normalizeValue(rawValue, colType)
    } catch (err) {
      log(`  Column "${colName}" type conflict (${err.message}) — storing null`, 'WARN')
      specRecord[colName] = null
    }
  }

  const record = {
    name,
    brand:       brand        || null,
    price:       price        ?? null,
    bhphoto_url: productUrl,
    image_url:   imageUrl     || null,
    subcategory: subcategory  || null,
    specs_json:  JSON.stringify(specs),
    scraped_at:  new Date().toISOString(),
    ...specRecord,
  }

  try {
    await upsertProduct(pg, table, record)
    scrapedUrls.add(productUrl)
    log(`  ✓ Saved: ${name}`)
    return 1
  } catch (err) {
    log(`  DB upsert failed for ${productUrl}: ${err.message}`, 'ERROR')
    return 0
  }
}

// ─── Category scraper ─────────────────────────────────────────────────────────
async function scrapeCategory(pg, category, fillMissing = false) {
  const { key, table, startUrls } = category
  log(`\n${'═'.repeat(64)}`)
  log(`  CATEGORY: ${key.toUpperCase()}   →   table: ${table}${fillMissing ? '  [fill-missing mode]' : ''}`)
  log(`${'═'.repeat(64)}`)

  await ensureTable(pg, table)
  const scrapedUrls = await loadScrapedUrls(pg, table, fillMissing)
  log(`  Already fully scraped in this table: ${scrapedUrls.size}`)

  let totalSaved = 0

  for (const startUrl of startUrls) {
    log(`\n  Start URL: ${startUrl}`)
    let pageUrl    = startUrl
    let pageNum    = 1
    let emptyPages = 0

    while (pageNum <= MAX_PAGES) {
      log(`\n── Page ${pageNum}: ${pageUrl}`)

      const listingHtml = await zrFetch(pageUrl)
      if (!listingHtml) {
        log('  No HTML returned for listing page — skipping start URL', 'WARN')
        break
      }

      const productLinks = extractProductLinks(listingHtml)

      if (productLinks.length === 0) {
        emptyPages++
        log(`  No products on page ${pageNum} (${emptyPages} consecutive)`, 'WARN')
        if (emptyPages >= 2) { log('  Reached end of category, stopping pagination'); break }
      } else {
        emptyPages = 0
      }

      // Filter already-scraped, then fire up to CONCURRENCY fetches in parallel
      const toScrape = productLinks.filter(url => !scrapedUrls.has(url))
      const skipped  = productLinks.length - toScrape.length
      if (skipped) log(`  Skipping ${skipped} already-scraped products`)
      log(`  Scraping ${toScrape.length} products (${CONCURRENCY} concurrent)`)

      for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
        const batch   = toScrape.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
          batch.map(url => scrapeOneProduct(pg, table, key, url, scrapedUrls))
        )
        totalSaved += results
          .filter(r => r.status === 'fulfilled')
          .reduce((sum, r) => sum + (r.value || 0), 0)
      }

      // Determine next page URL
      const nextUrl = extractNextPageUrl(listingHtml, pageUrl)
      if (!nextUrl || nextUrl === pageUrl) {
        log('  No next page detected — end of pagination')
        break
      }
      pageUrl = nextUrl
      pageNum++

      await sleep(2_000)  // brief pause between pages only
    }
  }

  log(`\n  Category "${key}" done. Products saved/updated this run: ${totalSaved}`)
  return totalSaved
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const fillMissing = args.includes('--fill-missing')
  const targetKey   = args.find(a => !a.startsWith('--'))?.toLowerCase() || null

  const categories = targetKey
    ? ALL_CATEGORIES.filter(c => c.key === targetKey)
    : ALL_CATEGORIES

  if (targetKey && categories.length === 0) {
    console.error(`Unknown category: "${targetKey}". Valid keys: ${ALL_CATEGORIES.map(c => c.key).join(', ')}`)
    process.exit(1)
  }

  log('════════════════════════════════════════════════════════════════')
  log('  DOMINION SCRAPER  —  B&H Photo → Supabase')
  log(`  Run started : ${new Date().toISOString()}`)
  log(`  Categories  : ${categories.map(c => c.key).join(', ')}`)
  log(`  Mode        : ${fillMissing ? 'fill-missing (re-scrape null image/specs)' : 'normal'}`)
  log(`  Log file    : ${LOG_FILE}`)
  log('════════════════════════════════════════════════════════════════')

  const pg = new PgClient({ connectionString: ENV.DB_URL })
  await pg.connect()
  log('PostgreSQL connected ✓\n')

  // When running all categories without --fill-missing, automatically run
  // fill-missing on the core categories first to backfill any gaps from
  // previous runs, then do a normal scrape pass on everything.
  const FILL_FIRST_CATEGORIES = new Set(['cameras', 'lenses', 'lighting'])

  let grandTotal = 0
  if (!targetKey && !fillMissing) {
    log('\n── Phase 1: fill missing specs/images for core categories ──')
    for (const category of categories.filter(c => FILL_FIRST_CATEGORIES.has(c.key))) {
      try {
        grandTotal += await scrapeCategory(pg, category, true)
      } catch (err) {
        log(`Category "${category.key}" (fill-missing) crashed: ${err.message}`, 'ERROR')
        log(err.stack, 'ERROR')
      }
    }
    log('\n── Phase 2: normal scrape for all categories ──')
  }

  for (const category of categories) {
    try {
      grandTotal += await scrapeCategory(pg, category, fillMissing)
    } catch (err) {
      log(`Category "${category.key}" crashed: ${err.message}`, 'ERROR')
      log(err.stack, 'ERROR')
      // Continue with remaining categories rather than aborting entire run
    }
  }

  await pg.end()
  logStream.end()

  log('\n════════════════════════════════════════════════════════════════')
  log(`  Run complete.  Total saved/updated: ${grandTotal}`)
  log(`  Log: ${LOG_FILE}`)
  log('════════════════════════════════════════════════════════════════')
}

main().catch(err => {
  log(`FATAL: ${err.message}`, 'ERROR')
  log(err.stack, 'ERROR')
  logStream.end()
  process.exit(1)
})
