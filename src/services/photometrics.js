// ─── Shared photometrics parsing utilities ───────────────────────────────────
// Used by PhotometricTable (product page) and ComparePage (comparison feature)
//
// Handles 4 formats:
//   1. B&H   — "514 fc / 5,532 Lux at 3.3' / 1 m (Unmodified)"
//   2. Nanlux pipe-table — config rows × distance columns, "5532 lux514 fc" cells
//   3. Aputure CS15 style — (CCT, dist) rows × config columns, "1,818 lux / 169 fc" cells
//   4. Aputure Nova style — CCT rows × distance columns, paired Lux / Footcandles rows

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normDist(raw) {
  if (!raw) return null
  const s = raw.replace(/\s+/g, '').toLowerCase()
  const m = s.match(/^([\d.]+)\s*m$/)
  if (m) {
    const meters = parseFloat(m[1])
    const feet   = (meters * 3.28084).toFixed(1)
    return `${feet}' / ${meters}m`
  }
  return raw.trim()
}

function parseLuxFc(cell) {
  if (!cell) return null
  const s = String(cell).replace(/,/g, '')

  // "1818 lux / 169 fc"  or  "1,818 lux / 169 fc"
  let m = s.match(/(\d+(?:\.\d+)?)\s*lux\s*\/\s*(\d+(?:\.\d+)?)\s*fc/i)
  if (m) return { lux: m[1], fc: m[2] }

  // "5532 lux514 fc"  (Nanlux — no separator between lux value and fc)
  m = s.match(/(\d+(?:\.\d+)?)\s*lux\s*(\d+(?:\.\d+)?)\s*fc/i)
  if (m) return { lux: m[1], fc: m[2] }

  // "169 fc / 1818 lux" (rare reversed order)
  m = s.match(/(\d+(?:\.\d+)?)\s*fc\s*\/\s*(\d+(?:\.\d+)?)\s*lux/i)
  if (m) return { lux: m[2], fc: m[1] }

  // bare numbers (split lux/fc table — caller supplies type)
  m = s.match(/^(\d+(?:\.\d+)?)$/)
  if (m) return { lux: m[1], fc: null }

  return null
}

function splitPipe(line) {
  return line.split('|').map(c => c.trim())
}

function isCCT(s) {
  return /^\d{3,5}K(\s*[-–]\s*\d{3,5}K)?$/i.test(s.replace(/,/g,'').trim())
}

function isDistance(s) {
  return /^[\d.]+\s*m$/i.test(s.trim())
}

// ─── Format 1: B&H style  ────────────────────────────────────────────────────
// "514 fc / 5,532 Lux at 3.3' / 1 m (Unmodified)"
function parseBH(text, footnotes) {
  const tokens = []
  const HDR_RE       = /(?:(\d+(?:\.\d+)?°)\s*at\s+)?(\d{3,5}K(?:\s*[-–]\s*\d{3,5}K)?)\s*:/gi
  const HDR_ANGLE_RE = /(\d+(?:\.\d+)?°)\s*at\s*:/gi
  const MEAS_RE      = /([\d,]+)\s*fc\s*\/\s*([\d,]+)\s*[Ll]ux\s+at\s+([\d.]+[''′]?\s*\/\s*[\d.]+\s*m)(?:\s*\(([^)]+)\))?/gi

  let m
  while ((m = HDR_RE.exec(text))       !== null) tokens.push({ type: 'hdr', pos: m.index, angle: m[1]||null, cct: m[2] })
  while ((m = HDR_ANGLE_RE.exec(text)) !== null) tokens.push({ type: 'hdr', pos: m.index, angle: m[1],       cct: null  })
  while ((m = MEAS_RE.exec(text))      !== null) tokens.push({
    type: 'meas', pos: m.index,
    fc: m[1], lux: m[2],
    distance: m[3].replace(/\s+/g, ''),
    modifier: m[4]?.trim() || null,
  })

  tokens.sort((a, b) => a.pos - b.pos)
  const seen = new Set()
  for (let i = tokens.length - 1; i >= 0; i--) {
    const key = `${tokens[i].type}:${tokens[i].pos}`
    if (seen.has(key)) tokens.splice(i, 1)
    else seen.add(key)
  }

  const rows = []
  let curCCT = null, curAngle = null
  for (const t of tokens) {
    if (t.type === 'hdr') { curCCT = t.cct; curAngle = t.angle }
    else rows.push({ cct: curCCT, angle: curAngle, distance: t.distance, fc: t.fc, lux: t.lux, modifier: t.modifier })
  }
  return rows
}

// ─── Format 2: Nanlux — config rows × distance columns ───────────────────────
// Row 0: "CCT | 5600K"
// Row 1: "Distance | 3M | 5M | 7M | 10M"
// Row N: "Light Only | 5532 lux514 fc | 2373 lux220 fc | ..."
// Row N: "With Reflector | ..."
// Row N: "With Fresnel Lens 11° | ..."
function parseNanluxTable(lines) {
  const rows = []
  let cct = null
  let distances = []
  let inTable = false

  for (const line of lines) {
    if (!line.includes('|')) continue
    const cells = splitPipe(line)
    if (!cells.length) continue

    const label = cells[0].toLowerCase()

    // CCT header: "CCT | 5600K"
    if (label === 'cct' && cells[1]) {
      cct = cells[1].trim()
      continue
    }

    // Distance header: "Distance | 3M | 5M | ..."
    if (label === 'distance' || label === 'dis.' || label === 'dist') {
      distances = cells.slice(1).map(d => normDist(d) || d)
      inTable = true
      continue
    }

    if (!inTable || distances.length === 0) continue

    // Data row: "Light Only | 5532 lux514 fc | ..."
    const config = cells[0]
    if (!config) continue

    // Map config label to modifier/angle fields
    let modifier = config
    let angle = null

    // Extract angle from "With Fresnel Lens 11°" → angle=null, modifier="Fresnel Lens 11°"
    const fresnelM = config.match(/fresnel(?:\s+lens)?\s+([\d.]+°)/i)
    if (fresnelM) { angle = null; modifier = `Fresnel ${fresnelM[1]}` }
    else if (/light\s*only|bare|open\s*face|no\s*modifier/i.test(config)) { modifier = 'Unmodified' }
    else if (/reflector/i.test(config)) {
      // "With Reflector" or "With RF-NLM-45 Reflector" etc
      const degM = config.match(/([\d.]+)\s*°/)
      modifier = degM ? `Reflector ${degM[1]}°` : 'Reflector'
    }

    cells.slice(1).forEach((cell, di) => {
      if (di >= distances.length) return
      const parsed = parseLuxFc(cell)
      if (parsed) {
        rows.push({ cct, angle, distance: distances[di], fc: parsed.fc, lux: parsed.lux, modifier })
      }
    })
  }
  return rows
}

// ─── Format 3: Aputure CS15 — (CCT, dist) rows × config columns ──────────────
// Row 0: "CCT | Dis. | No Reflector | 50° Reflector | 35° Reflector | ..."
// Row N: "2,000K | 3m | 1,818 lux / 169 fc | 5,310 lux / 493 fc | ..."
function parseAputureConfigCols(lines) {
  const rows = []
  let configs = []
  let headerParsed = false

  for (const line of lines) {
    if (!line.includes('|')) continue
    const cells = splitPipe(line)
    if (cells.length < 3) continue

    const c0 = cells[0].toLowerCase().replace(/,/g,'').trim()
    const c1 = cells[1].toLowerCase().replace(/,/g,'').trim()

    // Header row: first col is "CCT", second col is "Dis." or similar
    if (!headerParsed && (c0 === 'cct' || c0 === '') && (c1 === 'dis.' || c1 === 'dist' || isDistance(c1) || c1 === 'distance' || c1 === 'dis')) {
      configs = cells.slice(2).map(c => c.trim())
      headerParsed = true
      continue
    }

    if (!headerParsed) continue

    const cct = isCCT(cells[0]) ? cells[0].replace(/,/g,'').trim() : null
    const dist = normDist(cells[1].trim()) || cells[1].trim()
    if (!cct && !dist) continue

    cells.slice(2).forEach((cell, ci) => {
      if (ci >= configs.length) return
      const parsed = parseLuxFc(cell)
      if (!parsed) return
      const config = configs[ci]
      // Extract angle from "50° Reflector" → angle=null, modifier="50° Reflector"
      const degM = config.match(/([\d.]+)\s*°/)
      rows.push({
        cct, angle: null, distance: dist,
        fc: parsed.fc, lux: parsed.lux,
        modifier: config,
      })
    })
  }
  return rows
}

// ─── Format 4: Aputure Nova — CCT rows × distance columns, paired lux/fc ─────
// Row 0: "CCT | Distance | 1m | 3m | 5m"   or   "CCT / Distance | 1m | 3m | 5m"
// Row N: "2700K | Lux | 14,586 | 1,850 | 725"
// Row N: "       | Footcandles | 1,363 | 173 | 68"   (empty first cell)
// -or-
// Row N: "2700K | 14,586 lux | 1,850 lux | 725 lux"
// Row N: "      | 1,363 fc   | 173 fc    | 68 fc"
function parseAputureNova(lines) {
  const rows = []
  let distances = []
  let headerParsed = false
  let pendingCCT = null
  let pendingLux = []

  for (const line of lines) {
    if (!line.includes('|')) continue
    const cells = splitPipe(line)
    if (cells.length < 3) continue

    const c0 = cells[0].replace(/,/g,'').trim()
    const c1 = cells[1].replace(/,/g,'').trim().toLowerCase()

    // Header row: "CCT | Distance | 1m | 3m | 5m" or "CCT / Distance | 1m | 3m | 5m"
    if (!headerParsed && /cct/i.test(c0) && (isDistance(cells[2]) || /^\d/.test(cells[2]))) {
      distances = cells.slice(/dist/i.test(c1) ? 2 : 1).map(d => normDist(d.trim()) || d.trim())
      headerParsed = true
      continue
    }

    if (!headerParsed) continue

    // Type A: "2700K | Lux | 14586 | 1850 | 725"
    //         "      | Footcandles | 1363 | 173 | 68"
    if (c1 === 'lux' || c1 === 'footcandles' || c1 === 'fc') {
      const values = cells.slice(2)
      if (c0) pendingCCT = c0   // new CCT

      if (c1 === 'lux') {
        pendingLux = values.map(v => v.replace(/,/g,'').trim())
      } else {
        // fc row — zip with pending lux
        values.forEach((fcVal, di) => {
          if (di >= distances.length) return
          const lux = pendingLux[di]
          const fc  = fcVal.replace(/,/g,'').trim()
          if (lux && fc && pendingCCT) {
            rows.push({ cct: pendingCCT, angle: null, distance: distances[di], fc, lux, modifier: null })
          }
        })
        pendingLux = []
      }
      continue
    }

    // Type B: "2700K | 14,586 lux | 1,850 lux | 725 lux"
    //         "      | 1,363 fc   | 173 fc    | 68 fc"
    const firstValParsed = parseLuxFc(cells[1])
    if (firstValParsed) {
      const isLuxRow = /lux/i.test(cells[1])
      const isFcRow  = /fc\b|foot/i.test(cells[1])
      if (c0) pendingCCT = c0

      if (isLuxRow) {
        pendingLux = cells.slice(1).map(v => {
          const p = parseLuxFc(v)
          return p?.lux ?? v.replace(/[^\d.]/g,'').trim()
        })
      } else if (isFcRow) {
        cells.slice(1).forEach((cell, di) => {
          if (di >= distances.length) return
          const p = parseLuxFc(cell)
          const fc  = p?.fc ?? cell.replace(/[^\d.]/g,'').trim()
          const lux = pendingLux[di]
          if (lux && fc && pendingCCT) {
            rows.push({ cct: pendingCCT, angle: null, distance: distances[di], fc, lux, modifier: null })
          }
        })
        pendingLux = []
      }
      continue
    }

    // Type C: "2700K | 14,586 lux | 1,850 lux | 725 lux" where lux+fc are BOTH in the same row
    // (Not seen so far but handle gracefully)
  }
  return rows
}

// ─── Main entry ──────────────────────────────────────────────────────────────
export function parsePhotometrics(raw) {
  if (!raw || typeof raw !== 'string') return null

  const footnotes = []
  const text = raw
    .replace(/\*\*([^*]+)/g, (_, note) => { const t = note.trim(); if (t) footnotes.push(t); return '' })
    .replace(/\*/g, ' ')
    .trim()
  if (!text) return null

  // Try B&H format first (dominant format for most of our catalogue)
  const bhRows = parseBH(text, footnotes)
  if (bhRows.length >= 2) return { rows: bhRows, footnotes }

  // Pipe-table formats: split to lines and try each parser
  const lines = text.split(/\n/)
  const hasPipe = lines.some(l => l.includes('|'))
  if (!hasPipe) return bhRows.length ? { rows: bhRows, footnotes } : null

  // Detect which pipe-table format this is and try all — return richest result
  const results = [
    parseNanluxTable(lines),
    parseAputureConfigCols(lines),
    parseAputureNova(lines),
  ]

  let best = bhRows
  for (const r of results) {
    if (r.length > best.length) best = r
  }

  return best.length ? { rows: best, footnotes } : null
}

export function configLabel(angle, modifier) {
  const stripped = modifier != null ? modifier.replace(/^with\s+/i, '').trim() : null
  const effectiveMod = stripped === 'Unmodified' ? null : stripped

  if (effectiveMod) return [angle, effectiveMod].filter(Boolean).join(' ')

  if (!angle) return 'Open Face'
  return modifier != null ? `${angle} Open Face` : angle
}

export function toMeters(dist) {
  // Handles "3.3' / 1 m", "1m", "3M", etc.
  let m = dist?.match(/\/\s*([\d.]+)\s*m/i)
  if (m) return parseFloat(m[1])
  m = dist?.match(/^([\d.]+)\s*m$/i)
  if (m) return parseFloat(m[1])
  return 999
}

export function fmtNum(n) {
  if (n == null) return '—'
  return Number(String(n).replace(/,/g, '')).toLocaleString()
}
