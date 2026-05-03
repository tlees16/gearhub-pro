#!/usr/bin/env node
/**
 * price_scraper.cjs
 * Scrapes new retail prices from Adorama and CVP.
 *
 * Adorama: search via __NEXT_DATA__ gives name + URL + price in one call.
 * CVP:     search is AJAX-only — fetches sitemap once to discover product
 *          URLs, caches them, then hits product pages for prices.
 *
 * Tables created:
 *   retailer_urls  — cached product page URL per product per retailer (once)
 *   retail_prices  — price history with scraped_at timestamp
 *
 * Usage:
 *   node price_scraper.cjs                    # all retailers, all tables
 *   node price_scraper.cjs adorama            # Adorama only
 *   node price_scraper.cjs cvp                # CVP only
 *   node price_scraper.cjs adorama cameras    # Adorama + cameras only
 *   node price_scraper.cjs --discover         # discover URLs only, no prices saved
 *   node price_scraper.cjs --test adorama "Sony FX3"
 *   node price_scraper.cjs --test cvp "Sony FX3"
 */
'use strict'

require('dotenv').config()
const axios   = require('axios')
const cheerio = require('cheerio')
const { Client: PgClient } = require('pg')
const fs   = require('fs')
const path = require('path')

// ─── Env ──────────────────────────────────────────────────────────────────────
const ENV = {
  DB_URL:       process.env.SUPABASE_DB_URL,
  SCRAPFLY_KEY: process.env.SCRAPFLY_API_KEY,
}
for (const [k, v] of Object.entries(ENV)) {
  if (!v) { console.error(`[FATAL] Missing env: ${k}`); process.exit(1) }
}

// ─── Logger ───────────────────────────────────────────────────────────────────
const LOG_PATH = path.join(__dirname, 'price_scraper_log.txt')
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' })
function log(msg, level = 'INFO') {
  const line = `[${new Date().toISOString()}] [${level.padEnd(5)}] ${msg}`
  console.log(line)
  logStream.write(line + '\n')
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Fetch ────────────────────────────────────────────────────────────────────
const SCRAPFLY_API = 'https://api.scrapfly.io/scrape'
const DESKTOP_UA   = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function scrapflyFetch(url, opts = {}) {
  const { asp = false, country = 'us', wait = 3000 } = opts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(SCRAPFLY_API, {
        params: {
          key: ENV.SCRAPFLY_KEY, url, render_js: 'true',
          ...(asp ? { asp: 'true' } : {}),
          country, wait,
        },
        timeout: 120_000,
      })
      return res.data?.result?.content ?? null
    } catch (err) {
      log(`  Scrapfly [${attempt}/3] ${err.response?.status ?? err.message}`, 'WARN')
      if (attempt < 3) await sleep(attempt * 8_000)
    }
  }
  return null
}

async function directFetch(url) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': DESKTOP_UA },
      timeout: 30_000,
      responseType: 'text',
    })
    return res.data
  } catch (_) {
    return null
  }
}

// ─── Name matching ────────────────────────────────────────────────────────────
function nameSimilarity(a, b) {
  const tok = s => new Set(
    s.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length > 1)
  )
  const ta = tok(a), tb = tok(b)
  const intersection = [...ta].filter(t => tb.has(t)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : intersection / union
}

// ─── Adorama ──────────────────────────────────────────────────────────────────
// Search URL returns __NEXT_DATA__ with pageProps.products array.
// Each product has: productTitle, productUrl, prices.price (USD number), stock.
// One search call = name + URL + price. No product page fetch needed.

const _ADORAMA_USED_RE = /\bused\b|\bpre[- ]?owned\b|\brefurbished\b|\bopen[- ]?box\b|\bex[- ]?demo\b/i
const _ADORAMA_ACCESSORY_RE = /\bwebcam\b|\bweb\s*cam\b|\bstreaming\s*camera\b|\busb\s*camera\b|\bconferencing\b|\bcage\b|\brig\b|\bhandle\b|\bstrap\b|\bcharger\b|\badapter\b|\btripod\b|\bgimbal\b/i

function adoramaParseSearch(html) {
  const $ = cheerio.load(html)
  const raw = $('script#__NEXT_DATA__').html()
  if (!raw) return []
  try {
    const products = JSON.parse(raw)?.props?.pageProps?.products ?? []
    return products
      .map(p => ({
        name:    p.productTitle ?? p.shortTitle ?? '',
        url:     p.productUrl ? `https://www.adorama.com${p.productUrl}` : null,
        price:   p.prices?.price ?? null,   // USD, already a number
        inStock: p.stock === 'In',
      }))
      // Exclude used/refurbished/open-box listings — retail_prices is new-only
      // Exclude accessories/peripherals that could fuzzy-match real products
      .filter(p => p.name && p.url && p.price !== null
        && !_ADORAMA_USED_RE.test(p.name)
        && !_ADORAMA_ACCESSORY_RE.test(p.name))
  } catch (_) {
    return []
  }
}

async function runAdorama(pg, tables, discoverOnly, freshDays) {
  log('\n══ ADORAMA ══')
  const cached  = await loadCachedUrls(pg, 'adorama')
  const recentSet = await loadRecentlyScraped(pg, 'adorama', tables, freshDays)
  log(`  ${cached.size} URLs cached  |  ${recentSet.size} products skip (≤${freshDays}d old)`)

  for (const table of tables) {
    const { rows: products } = await pg.query(
      `SELECT id, name FROM "${table}" WHERE name IS NOT NULL ORDER BY name`
    )
    if (!products.length) continue
    log(`\n  ── ${table} (${products.length} products) ──`)

    for (const product of products) {
      if (recentSet.has(`${table}:${product.id}`)) {
        log(`  → ${product.name}: skip (fresh)`)
        continue
      }
      log(`  → ${product.name}`)
      const searchUrl = `https://www.adorama.com/l/?searchinfo=${encodeURIComponent(product.name)}`
      const html = await scrapflyFetch(searchUrl, { asp: true, country: 'us', wait: 5000 })
      if (!html) { log(`    ✗ fetch failed`, 'WARN'); await sleep(2000); continue }

      const results = adoramaParseSearch(html)
      if (!results.length) { log(`    ✗ no results in __NEXT_DATA__`, 'WARN'); await sleep(2000); continue }

      // Best match by name similarity
      let best = null, bestScore = 0
      for (const r of results) {
        const s = nameSimilarity(product.name, r.name)
        if (s > bestScore) { bestScore = s; best = r }
      }

      if (!best || bestScore < 0.35) {
        log(`    ✗ no match (best: "${results[0]?.name?.slice(0, 50)}" @ ${bestScore.toFixed(2)})`, 'WARN')
        await sleep(2000); continue
      }

      log(`    ✓ "${best.name.slice(0, 55)}" score=${bestScore.toFixed(2)} USD ${best.price} ${best.inStock ? '✓ in stock' : '✗ OOS'}`)
      await cacheUrl(pg, { productTable: table, productId: product.id, retailer: 'adorama', url: best.url, score: bestScore })

      if (!discoverOnly) {
        await savePrice(pg, { productTable: table, productId: product.id, retailer: 'adorama', price: best.price, currency: 'USD', inStock: best.inStock })
      }
      await sleep(2000)
    }
  }
}

// ─── CVP ──────────────────────────────────────────────────────────────────────
// Search is AJAX — can't scrape. Instead:
//   1. Fetch sitemap.xml (plain HTTP, no JS, one call per run)
//   2. Match product names to slug URLs → cache in retailer_urls
//   3. Fetch product pages for current price (.uk-product_price = ex-VAT GBP)

let _cvpSitemap = null

async function cvpLoadSitemap() {
  if (_cvpSitemap) return _cvpSitemap

  log('  Fetching CVP sitemap…')
  let xml = await directFetch('https://cvp.com/sitemap.xml')
  if (!xml) xml = await directFetch('https://cvp.com/sitemap_index.xml')
  if (!xml) {
    log('  CVP sitemap unreachable — trying Scrapfly', 'WARN')
    xml = await scrapflyFetch('https://cvp.com/sitemap.xml', { country: 'gb', wait: 2000 })
  }

  if (!xml || typeof xml !== 'string') { log('  CVP sitemap failed', 'WARN'); return [] }

  const urls = [...xml.matchAll(/<loc>(https:\/\/cvp\.com\/product\/[^<]+)<\/loc>/g)].map(m => m[1])
  log(`  CVP sitemap: ${urls.length} product URLs`)
  _cvpSitemap = urls
  return urls
}

// "sony-ilme-fx3-full-frame-cinema-camera" → "sony ilme fx3 full frame cinema camera"
function cvpSlugToWords(url) {
  return url.replace('https://cvp.com/product/', '').replace(/-/g, ' ')
}

async function cvpMatchUrl(productName) {
  const urls = await cvpLoadSitemap()
  if (!urls.length) return null
  let best = null, bestScore = 0
  for (const url of urls) {
    const s = nameSimilarity(productName, cvpSlugToWords(url))
    if (s > bestScore) { bestScore = s; best = url }
  }
  return best && bestScore >= 0.35 ? { url: best, score: bestScore } : null
}

function cvpParsePrice(html) {
  const $ = cheerio.load(html)
  // Confirmed from debug: .uk-product_price = ex-VAT price e.g. "£2,982.50"
  const exVat = $('.uk-product_price').first().text().trim()
  const price = parseFloat(exVat.replace(/[^0-9.]/g, ''))
  if (!isNaN(price) && price > 0) {
    const inStock = $('button[class*="add-to-cart"], [class*="btn-cart"]').length > 0
    return { price, inStock, currency: 'GBP' }
  }
  // Fallback
  const fallback = $('[itemprop="price"]').first()
  const fp = parseFloat((fallback.attr('content') ?? fallback.text()).replace(/[^0-9.]/g, ''))
  if (!isNaN(fp) && fp > 0) return { price: fp, inStock: null, currency: 'GBP' }
  return null
}

async function runCVP(pg, tables, discoverOnly, freshDays) {
  log('\n══ CVP ══')
  const cached    = await loadCachedUrls(pg, 'cvp')
  const recentSet = await loadRecentlyScraped(pg, 'cvp', tables, freshDays)
  log(`  ${cached.size} URLs cached  |  ${recentSet.size} products skip (≤${freshDays}d old)`)

  // Load sitemap once for whole run (no Scrapfly cost if plain HTTP works)
  const sitemapUrls = await cvpLoadSitemap()
  if (!sitemapUrls.length) { log('  No sitemap URLs — skipping CVP', 'WARN'); return }

  for (const table of tables) {
    const { rows: products } = await pg.query(
      `SELECT id, name FROM "${table}" WHERE name IS NOT NULL ORDER BY name`
    )
    if (!products.length) continue
    log(`\n  ── ${table} (${products.length} products) ──`)

    for (const product of products) {
      const cacheKey = `${table}:${product.id}`
      if (recentSet.has(cacheKey)) {
        log(`  → ${product.name}: skip (fresh)`)
        continue
      }
      let url = cached.get(cacheKey)

      if (!url) {
        const match = await cvpMatchUrl(product.name)
        if (!match) { log(`  → ${product.name}: ✗ no sitemap match`); continue }
        url = match.url
        log(`  → ${product.name}: matched ${url} (score ${match.score.toFixed(2)})`)
        await cacheUrl(pg, { productTable: table, productId: product.id, retailer: 'cvp', url, score: match.score })
        cached.set(cacheKey, url)
      } else {
        log(`  → ${product.name}: cached`)
      }

      if (discoverOnly) continue

      // Fetch product page for price
      const html = await scrapflyFetch(url, { asp: true, country: 'gb', wait: 4000 })
      if (!html) { log(`    ✗ product page fetch failed`, 'WARN'); await sleep(2000); continue }

      const result = cvpParsePrice(html)
      if (!result) { log(`    ✗ price not found on page`, 'WARN'); await sleep(2000); continue }

      log(`    ✓ GBP ${result.price} ex-VAT ${result.inStock ? '✓ in stock' : ''}`)
      await savePrice(pg, { productTable: table, productId: product.id, retailer: 'cvp', price: result.price, currency: 'GBP', inStock: result.inStock })
      await sleep(2000)
    }
  }
}

// ─── DB ───────────────────────────────────────────────────────────────────────
const ALL_TABLES = ['cameras', 'lenses', 'lighting', 'drones', 'gimbals', 'tripods', 'monitors']

async function setupDB(pg) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS retailer_urls (
      id            BIGSERIAL PRIMARY KEY,
      product_table TEXT    NOT NULL,
      product_id    BIGINT  NOT NULL,
      retailer      TEXT    NOT NULL,
      url           TEXT    NOT NULL,
      match_score   NUMERIC(5,4),
      discovered_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (product_table, product_id, retailer)
    )
  `)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS retail_prices (
      id            BIGSERIAL PRIMARY KEY,
      product_table TEXT        NOT NULL,
      product_id    BIGINT      NOT NULL,
      retailer      TEXT        NOT NULL,
      price         NUMERIC(10,2),
      currency      TEXT        NOT NULL,
      in_stock      BOOLEAN,
      scraped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pg.query(`
    CREATE INDEX IF NOT EXISTS retail_prices_lookup
    ON retail_prices (product_table, product_id, retailer, scraped_at DESC)
  `)
  log('DB tables ready ✓')
}

async function loadCachedUrls(pg, retailer) {
  const { rows } = await pg.query(
    `SELECT product_table, product_id, url FROM retailer_urls WHERE retailer = $1`,
    [retailer]
  )
  const map = new Map()
  for (const r of rows) map.set(`${r.product_table}:${r.product_id}`, r.url)
  return map
}

// Returns a Set of "table:id" keys for products already scraped within freshDays.
// freshDays = 0 disables the check (always re-scrape).
async function loadRecentlyScraped(pg, retailer, tables, freshDays) {
  if (!freshDays) return new Set()
  const cutoff = new Date(Date.now() - freshDays * 86_400_000).toISOString()
  const { rows } = await pg.query(
    `SELECT DISTINCT product_table, product_id FROM retail_prices
     WHERE retailer = $1 AND scraped_at > $2 AND product_table = ANY($3)`,
    [retailer, cutoff, tables]
  )
  return new Set(rows.map(r => `${r.product_table}:${r.product_id}`))
}

async function cacheUrl(pg, { productTable, productId, retailer, url, score }) {
  await pg.query(`
    INSERT INTO retailer_urls (product_table, product_id, retailer, url, match_score)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (product_table, product_id, retailer)
    DO UPDATE SET url = EXCLUDED.url, match_score = EXCLUDED.match_score, discovered_at = NOW()
  `, [productTable, productId, retailer, url, score ?? null])
}

async function savePrice(pg, { productTable, productId, retailer, price, currency, inStock }) {
  await pg.query(`
    INSERT INTO retail_prices (product_table, product_id, retailer, price, currency, in_stock)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [productTable, productId, retailer, price, currency, inStock ?? null])
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)

  // --test mode: validate a single search without touching the DB
  if (args.includes('--test')) {
    const idx   = args.indexOf('--test')
    const rKey  = args[idx + 1]
    const query = args[idx + 2]
    if (!query || !['adorama', 'cvp'].includes(rKey)) {
      console.error('Usage: node price_scraper.cjs --test adorama|cvp "<query>"')
      process.exit(1)
    }

    if (rKey === 'adorama') {
      const url  = `https://www.adorama.com/l/?searchinfo=${encodeURIComponent(query)}`
      console.log(`Fetching: ${url}`)
      const html = await scrapflyFetch(url, { asp: true, country: 'us', wait: 5000 })
      if (!html) { console.error('Fetch failed'); process.exit(1) }
      const results = adoramaParseSearch(html)
      console.log(`\n${results.length} products in response:`)
      results.forEach(r => {
        const score = nameSimilarity(query, r.name)
        console.log(`  [${score.toFixed(2)}] USD ${String(r.price ?? '?').padStart(8)} ${r.inStock ? '✓' : '✗'} — ${r.name.slice(0, 60)}`)
      })
    }

    if (rKey === 'cvp') {
      const urls = await cvpLoadSitemap()
      console.log(`Sitemap: ${urls.length} product URLs`)
      const top5 = urls
        .map(u => ({ url: u, score: nameSimilarity(query, cvpSlugToWords(u)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      console.log(`\nTop matches for "${query}":`)
      top5.forEach(r => console.log(`  [${r.score.toFixed(2)}] ${r.url}`))
    }
    return
  }

  // Normal run
  const runAdoramaFlag = args.includes('adorama') || !args.includes('cvp')
  const runCVPFlag     = args.includes('cvp')     || !args.includes('adorama')
  const discoverOnly   = args.includes('--discover')
  const selectedTables = ALL_TABLES.filter(t => args.includes(t))
  const tables         = selectedTables.length ? selectedTables : ALL_TABLES

  // --fresh-days N: skip products already scraped within N days (default 30)
  const freshIdx  = args.findIndex(a => a === '--fresh-days')
  const freshDays = freshIdx !== -1 ? (parseInt(args[freshIdx + 1]) || 30) : 30

  log('════════════════════════════════════════════════════════════════')
  log('  RETAIL PRICE SCRAPER  —  Adorama + CVP')
  log(`  Retailers  : ${[runAdoramaFlag && 'adorama', runCVPFlag && 'cvp'].filter(Boolean).join(', ')}`)
  log(`  Tables     : ${tables.join(', ')}`)
  log(`  Mode       : ${discoverOnly ? 'discover URLs only' : 'discover + price'}`)
  log(`  Fresh days : ${freshDays} (skip if scraped within this many days)`)
  log('════════════════════════════════════════════════════════════════')

  const pg = new PgClient({ connectionString: ENV.DB_URL })
  await pg.connect()
  log('PostgreSQL connected ✓\n')
  await setupDB(pg)

  if (runAdoramaFlag) await runAdorama(pg, tables, discoverOnly, freshDays)
  if (runCVPFlag)     await runCVP(pg, tables, discoverOnly, freshDays)

  log('\nDone ✓')
  await pg.end()
}

main().catch(err => { log(err.message, 'ERROR'); process.exit(1) })
