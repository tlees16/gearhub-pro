// ─── Analysis cache ───────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'gearhub_analysis_v3_'
const CACHE_TTL_MS     = 1000 * 60 * 60 * 24 * 14  // 14 days

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
    if (subcategory === 'Cinema' || cinemaBrands.test(b) || cinemaNames.test(n)) {
      return 'cinema'  // DPs, 1st ACs, operators
    }
    return 'hybrid'    // independent filmmakers, content creators, photographers
  }

  if (category === 'lenses') {
    const cineGlass = /arri|zeiss supreme|cooke|leica summicron|sigma cine|angénieux|angenieux|fujinon|schneider|dzofilm|tokina vista|atlas|laowa cine/
    if (cineGlass.test(b) || subcategory === 'Cine' || n.includes(' t') && /t\d/.test(n)) {
      return 'cine_lens'    // camera department, focus pullers
    }
    return 'photo_lens'     // photographers, hybrid shooters
  }

  if (category === 'lighting') return 'lighting'   // gaffers, cinematographers
  if (category === 'drones')   return 'drone'
  if (category === 'gimbals')  return 'gimbal'

  return 'general'
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(product, audience) {
  const { name, brand, category, price, subcategory, allSpecs } = product

  const priceStr    = price ? `$${price.toLocaleString()}` : 'price on request'
  const specsStr    = Object.entries(allSpecs || {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n')

  const audienceInstructions = {
    cinema: `
You are writing for professional cinematographers (DPs), 1st Assistant Cameras, and camera operators.
Use technical, precise language. These readers understand lens mounts, codecs, stop ratings, and production workflows.
They care about: dynamic range, codec efficiency, on-set ergonomics, rigging options, focus pulling characteristics, media costs, and rental availability.
Be honest about real-world quirks — menu complexity, heat management, rolling shutter, battery life, file size implications.
Do NOT write marketing language. Be direct and opinionated.`,

    hybrid: `
You are writing for independent filmmakers, content creators, and hybrid photographer/videographers.
Use accessible but technically informed language. These readers understand basics but may not be deep into cinema production.
They care about: image quality per dollar, autofocus performance, ease of use, lens ecosystem, run-and-gun capability, and versatility.
Be honest about real-world limitations — ergonomics for video, crop factors, overheating, codec quality at the price point.
Compare value honestly against obvious alternatives in the same price bracket.`,

    cine_lens: `
You are writing for camera department professionals — focus pullers (1st ACs), DPs, and lens technicians.
Use precise optical and mechanical language. These readers understand T-stops, image circles, focus breathing, parfocal, bokeh rendering.
They care about: focus throw, front diameter consistency, breathing, matching sets, image circle coverage, housing quality.
Be honest about rendering character — clinical vs. organic, flare characteristics, any known sample variation issues.`,

    photo_lens: `
You are writing for photographers and hybrid shooters.
Use clear optical language. These readers understand aperture, sharpness, bokeh, autofocus, and weather sealing.
They care about: sharpness wide open, autofocus speed and accuracy, weight for travel, image stabilization, value vs. alternatives.
Be direct about real-world optical performance — corners wide open, chromatic aberration, distortion.`,

    lighting: `
You are writing for gaffers, best boys, and cinematographers.
Use professional lighting language. These readers understand CRI, TLCI, Kelvin, DMX, stops of light, modifier systems.
They care about: output accuracy, color quality (CRI/TLCI), heat management, fan noise (critical for audio), power requirements, modifier compatibility, and build durability.
Be honest about real-world issues — heat at full power, fan noise at certain outputs, ballast cable limitations, power draw on location.`,

    drone: `
You are writing for aerial cinematographers and drone operators.
They care about: flight time, wind resistance, camera quality, gimbal stability, obstacle avoidance, transmission range, regulatory compliance.
Be honest about real-world performance limitations.`,

    gimbal: `
You are writing for camera operators and gimbal operators.
They care about: payload capacity, balance time, battery life, motor strength, follow modes, compatibility with their camera package.
Be honest about real-world tuning difficulty and payload limitations.`,

    general: `
You are writing for professional production crew and serious enthusiasts.
Be technically accurate, honest, and direct. Avoid marketing language.`,
  }

  return `${audienceInstructions[audience] || audienceInstructions.general}

Product: ${name}
Brand: ${brand}
Category: ${category}${subcategory ? ` / ${subcategory}` : ''}
Price: ${priceStr}

Technical specifications:
${specsStr || 'Not available'}

Write a product analysis in this exact JSON format. No markdown, no explanation, just valid JSON:

{
  "description": "2-3 sentence honest technical description. Lead with what this product actually IS and WHO it is for. Include one genuine insight about its real-world use or reputation in the industry.",
  "pros": [
    "Specific technical strength with brief explanation",
    "Another genuine advantage — be specific, not generic",
    "A third real strength",
    "Optional fourth if genuinely warranted"
  ],
  "cons": [
    "Honest limitation — include real-world implications (e.g. 'Rolling shutter visible in fast pans — plan shots accordingly')",
    "Another genuine limitation",
    "A third honest con"
  ],
  "communityVoice": "1-2 sentences synthesizing what working professionals and users actually say about this product in forums, reviews, and on set. Be specific — mention known quirks, community consensus, or production context where it shines or struggles.",
  "verdict": <integer 60-98, honest score reflecting value and performance for the target audience>
}`
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
      system: 'You are an expert in professional film and photography equipment with deep knowledge of production workflows, gear reputation, and real-world use. You write honest, technically accurate analysis — not marketing copy. Always respond with valid JSON only.',
      max_tokens: 800,
    }),
  })

  if (!res.ok) throw new Error(`API error ${res.status}`)

  const data = await res.json()
  const text = data.content?.[0]?.text || data.text || ''

  // Strip any markdown fences if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

// ─── Fallback (shown while loading or if API fails) ───────────────────────────
function buildFallback(product) {
  return {
    description: `The ${product.name} by ${product.brand} is a professional ${product.category.replace('_', ' ')} tool.`,
    pros:         ['Loading analysis…'],
    cons:         ['Loading analysis…'],
    communityVoice: null,
    verdict:      75,
    loading:      true,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Returns cached analysis immediately if available, otherwise triggers an async
 * fetch and calls onUpdate(analysis) when the result arrives.
 *
 * Usage in component:
 *   const [analysis, setAnalysis] = useState(() => getExpertAnalysis(product, setAnalysis))
 */
export function getExpertAnalysis(product, onUpdate) {
  const cached = getCached(product.id)
  console.log('[ExpertAnalysis] id:', product.id, 'cached:', !!cached)
  if (cached) return cached

  const fallback = buildFallback(product)

  // Kick off async fetch — don't await, just call onUpdate when ready
  if (onUpdate) {
    console.log('[ExpertAnalysis] fetching from API for:', product.name)
    fetchAnalysisFromAPI(product)
      .then(data => {
        setCache(product.id, data)
        onUpdate(data)
      })
      .catch((err) => {
        console.error('[ExpertAnalysis] API fetch failed:', err)
        // On failure, update with a slightly better fallback
        const better = {
          ...fallback,
          loading: false,
          description: `The ${product.name} by ${product.brand} is a professional ${product.category.replace('_', ' ')} tool. Analysis unavailable — check back shortly.`,
          pros: ['Specifications available in the Full Specs section below'],
          cons: ['Analysis could not be generated at this time'],
          communityVoice: null,
        }
        onUpdate(better)
      })
  }

  return fallback
}
