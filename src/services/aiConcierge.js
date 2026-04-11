import { SPEC_COLUMNS } from './dataService'

// ── Serialize product database into compact RAG context ──

function serializeProduct(p) {
  const specCols = SPEC_COLUMNS[p.category] || []
  const specs = specCols
    .map(([col, label]) => {
      const s = p.specs[col]
      if (!s || s.raw === 'N/A') return null
      return `${label}: ${s.raw}`
    })
    .filter(Boolean)
    .join(' | ')

  const price = p.price ? `$${p.price.toLocaleString()}` : p.priceRaw || 'N/A'
  return `- ${p.name} — Brand: ${p.brand} — Price: ${price} — ID: ${p.id}${specs ? ` — ${specs}` : ''}`
}

export function buildProductContext(products) {
  const cameras = products.filter(p => p.category === 'cameras')
  const lenses = products.filter(p => p.category === 'lenses')
  const lighting = products.filter(p => p.category === 'lighting')

  return [
    `=== CAMERAS (${cameras.length} products) ===`,
    ...cameras.map(serializeProduct),
    '',
    `=== LENSES (${lenses.length} products) ===`,
    ...lenses.map(serializeProduct),
    '',
    `=== LIGHTING (${lighting.length} products) ===`,
    ...lighting.map(serializeProduct),
  ].join('\n')
}

// ── System prompt with expert personality ──

export function buildSystemPrompt(products) {
  const context = buildProductContext(products)

  return `You are the GearHub Pro AI Concierge — an expert Cinematographer and Gaffer with decades of experience in cinema production. Your goal is to provide professional, budget-conscious kit recommendations based ONLY on the gear available in the GearHub database below.

RULES:
1. ONLY recommend products that exist in the database below. Never invent products.
2. When recommending a product, always write its exact name wrapped in double brackets like this: [[Sony FX3]]. This triggers an interactive product card in the UI.
3. Always include the price when recommending.
4. For budget queries ("build a kit under $X"), sum the prices of your recommendations and verify the total is within budget. Show the math.
5. For mount compatibility queries, cross-reference Camera "Lens Mount" with Lens "Mount" fields.
6. For lighting queries, reference Max Power (W) and Output (Lux@1m) to judge strength.
7. Keep responses concise and professional. Use short paragraphs. No walls of text.
8. If a user asks about products not in the database, say so honestly.
9. When comparing products, use a structured format with clear tradeoffs.

GEARHUB DATABASE (${products.length} total products):
${context}`
}

// ── Chat API call ──

export async function sendChatMessage(messages, systemPrompt) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      system: systemPrompt,
      messages,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `API error (${res.status})`)
  }

  // Extract text from Claude response
  const text = data.content
    ?.filter(b => b.type === 'text')
    .map(b => b.text)
    .join('') || ''

  return text
}

// ── Parse [[Product Name]] markers from response text ──

export function parseProductMentions(text, products) {
  const mentions = []
  const regex = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim()
    // Fuzzy match: exact name match or includes
    const product = products.find(
      p => p.name === name || p.name.toLowerCase() === name.toLowerCase()
    ) || products.find(
      p => p.name.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes(p.name.toLowerCase())
    )
    if (product) {
      mentions.push({
        marker: match[0],
        name: match[1],
        product,
        index: match.index,
      })
    }
  }

  return mentions
}
