// ─── Analysis cache ───────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'gearhub_analysis_v4_'
const CACHE_TTL_MS     = 1000 * 60 * 60 * 24 * 21  // 21 days

function getCached(productId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + productId)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(CACHE_KEY_PREFIX + productId); return null }
    return data
  } catch { return null }
}

function setCache(productId, data) {
  try { localStorage.setItem(CACHE_KEY_PREFIX + productId, JSON.stringify({ ts: Date.now(), data })) } catch {}
}

// ─── Audience detection ───────────────────────────────────────────────────────
function getAudience(product) {
  const { category, subcategory, brand, name } = product
  const n = (name || '').toLowerCase()
  const b = (brand || '').toLowerCase()

  if (category === 'cameras') {
    const cinemaBrands = /arri|red|blackmagic|panavision|venice|burano/
    const cinemaNames  = /alexa|ursa|komodo|raptor|cinema eos|c70|c300|c500|c700|fx[0-9]|fx30|venice|burano/
    if (subcategory === 'Cinema' || cinemaBrands.test(b) || cinemaNames.test(n)) return 'cinema'
    return 'hybrid'
  }
  if (category === 'lenses') {
    const cineGlass = /arri|zeiss supreme|cooke|leica summicron|sigma cine|angénieux|angenieux|fujinon|schneider|dzofilm|tokina vista|atlas|laowa cine/
    if (cineGlass.test(b) || subcategory === 'Cine' || n.includes(' t') && /t\d/.test(n)) return 'cine_lens'
    return 'photo_lens'
  }
  if (category === 'lighting' || category === 'lighting_accessories') return 'lighting'
  if (category === 'drones')   return 'drone'
  if (category === 'gimbals')  return 'gimbal'
  return 'general'
}

// Spec keys that are metadata, not product characteristics
const SPEC_EXCLUDE = new Set([
  'id', 'specs_json', 'scraped_at', 'bhphoto_url', 'image_url', 'bhphoto_sku',
  'created_at', 'productions_json', 'category', 'subcategory',
])

// Format spec value for readability
function fmtSpecValue(k, v) {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'object' && v !== null) return JSON.stringify(v)
  return String(v)
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(product, audience) {
  const { name, brand, category, price, subcategory, allSpecs } = product

  const priceStr = price ? `$${price.toLocaleString()} USD (MSRP)` : 'price on request'

  // Filter and format specs — exclude metadata, null/empty values
  const specsStr = Object.entries(allSpecs || {})
    .filter(([k, v]) =>
      !SPEC_EXCLUDE.has(k) &&
      v != null && v !== '' && v !== 'N/A' && v !== 'n/a' && String(v).trim() !== ''
    )
    .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${fmtSpecValue(k, v)}`)
    .join('\n')

  const audienceContext = {
    cinema: `Audience: professional cinematographers (DPs), 1st ACs, camera operators.
They understand lens mounts, codecs, stop ratings, on-set ergonomics, rigging, and rental economics.
They care about: dynamic range, codec efficiency, rolling shutter, heat management, rigging compatibility, media cost, and how it behaves in a real production environment.`,

    hybrid: `Audience: independent filmmakers, content creators, hybrid photographer/videographers.
They understand basics but aren't deep into cinema production.
They care about: image quality per dollar, autofocus reliability, ease of use, lens ecosystem, run-and-gun versatility, and overheating under sustained load.`,

    cine_lens: `Audience: focus pullers (1st ACs), DPs, and lens technicians.
They understand T-stops, image circles, focus breathing, parfocal behaviour, and bokeh rendering.
They care about: focus throw length, front diameter consistency, breathing on focus pulls, set-matching, image circle coverage for S35/FF/LF, and housing durability.`,

    photo_lens: `Audience: photographers and hybrid shooters.
They understand aperture, sharpness, bokeh, autofocus, and weather sealing.
They care about: wide-open sharpness, corner performance, autofocus speed/accuracy, IS effectiveness, and value vs. alternatives.`,

    lighting: `Audience: gaffers, best boys, and cinematographers.
They understand CRI, TLCI, Kelvin accuracy, DMX, stops of output, and modifier systems.
They care about: output accuracy, colour quality, fan noise (critical for audio proximity), power draw on location, modifier compatibility, and build durability in rental conditions.`,

    drone: `Audience: aerial cinematographers and drone operators.
They care about: flight time, wind resistance class, camera sensor quality, gimbal stabilisation, obstacle avoidance reliability, transmission range, and regulatory compliance.`,

    gimbal: `Audience: camera operators and gimbal technicians.
They care about: payload capacity vs. rated spec, balance time for different rigs, battery life under load, motor torque, follow mode quality, and real-world camera compatibility.`,

    general: `Audience: professional production crew and serious enthusiasts.
Write with technical precision. Avoid marketing language.`,
  }

  return `${audienceContext[audience] || audienceContext.general}

Product: ${name}
Brand: ${brand}
Category: ${category}${subcategory ? ` / ${subcategory}` : ''}
Price: ${priceStr}

GearHub verified specs:
${specsStr || '  (no spec data available)'}

Using the specs above as ground truth and your training knowledge of this specific product's real-world reputation, write an expert analysis.

Return this exact JSON — no markdown, no explanation:

{
  "description": "2-3 sentences. Lead with what makes this product distinctive — a specific capability, sensor characteristic, optical quality, or design trade-off evident in the specs or well-known in the industry. State clearly who it is for and what production context it fits best.",
  "pros": [
    "Specific strength tied directly to a spec or known real-world characteristic. Be precise — avoid generic phrases like 'excellent image quality'.",
    "Second genuine advantage. Cite specs where possible (e.g. '14+ stops of dynamic range from the dual-gain sensor').",
    "Third real strength.",
    "Fourth only if genuinely warranted — omit otherwise."
  ],
  "cons": [
    "Honest limitation with real-world implication (e.g. 'All-I codec generates ~1TB/hr — plan media budget accordingly').",
    "Second genuine limitation.",
    "Third only if real — omit padding."
  ],
  "industryContext": "1-2 sentences on this product's known reputation or notable use in real productions. Only include facts you are confident about from your training data — specific films, productions, or well-documented industry consensus. Return null if you have limited knowledge of this specific product's reputation.",
  "verdict": <integer 60-98>
}

Scoring rubric:
98-90: Sets the standard for its category — few meaningful competitors at any price
89-80: Excellent — highly recommended, only minor compromises
79-70: Solid — good value proposition, notable trade-offs worth knowing
69-60: Has significant limitations or serves a very specific niche

Be direct and honest. If a product has a well-known weakness (e.g. rolling shutter, overheating, poor autofocus), state it plainly. Do not invent specifications, user reviews, or production credits you are not confident about.`
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function fetchAnalysisFromAPI(product) {
  const audience = getAudience(product)
  const prompt   = buildPrompt(product, audience)

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a professional cinema and photography equipment analyst writing for working film crews and production professionals. You have deep technical knowledge of cameras, lenses, lighting, and production gear. Your analyses are grounded in verified specifications and genuine product knowledge from your training data. Never fabricate specifications, test results, production credits, or reviewer opinions you are not confident about. If you have limited knowledge of a specific product, base your analysis on the provided specs and say so in industryContext. Always respond with valid JSON only — no markdown fences, no explanation text.',
      max_tokens: 700,
    }),
  })

  if (!res.ok) throw new Error(`API error ${res.status}`)

  const data = await res.json()
  const text = data?.content?.[0]?.text || data.text || ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

// ─── Fallback (shown while loading or if API fails) ───────────────────────────
function buildFallback(product) {
  return {
    description: `The ${product.name} by ${product.brand} is a professional ${product.category.replace('_', ' ')} tool.`,
    pros:         ['Loading analysis…'],
    cons:         ['Loading analysis…'],
    industryContext: null,
    verdict:      75,
    loading:      true,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function getExpertAnalysis(product, onUpdate) {
  const cached = getCached(product.id)
  if (cached) return cached

  const fallback = buildFallback(product)

  if (onUpdate) {
    fetchAnalysisFromAPI(product)
      .then(data => {
        setCache(product.id, data)
        onUpdate(data)
      })
      .catch((err) => {
        console.error('[ExpertAnalysis] API fetch failed:', err)
        onUpdate({
          ...fallback,
          loading: false,
          description: `The ${product.name} by ${product.brand} is a professional ${product.category.replace('_', ' ')} tool. Analysis unavailable — check back shortly.`,
          pros: ['Specifications available in the Full Specs section below'],
          cons: ['Analysis could not be generated at this time'],
          industryContext: null,
        })
      })
  }

  return fallback
}
