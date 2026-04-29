// ─── Shared photometrics parsing utilities ───────────────────────────────────
// Used by PhotometricTable (product page) and ComparePage (comparison feature)

export function parsePhotometrics(raw) {
  if (!raw || typeof raw !== 'string') return null

  const footnotes = []
  const text = raw
    .replace(/\*\*([^*]+)/g, (_, note) => { const t = note.trim(); if (t) footnotes.push(t); return '' })
    .replace(/\*/g, ' ')
    .trim()
  if (!text) return null

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

  return rows.length ? { rows, footnotes } : null
}

export function configLabel(angle, modifier) {
  const stripped = modifier != null ? modifier.replace(/^with\s+/i, '').trim() : null
  const effectiveMod = stripped === 'Unmodified' ? null : stripped

  if (effectiveMod) return [angle, effectiveMod].filter(Boolean).join(' ')

  // No real modifier — distinguish explicitly-tagged "Unmodified" from absent modifier.
  // Absent modifier = bare beam angle (e.g. fresnel spot/flood) → just show the angle.
  // Explicit "Unmodified" paren = B&H confirmed no accessory → label as "Open Face".
  if (!angle) return 'Open Face'
  return modifier != null ? `${angle} Open Face` : angle
}

export function toMeters(dist) {
  const m = dist?.match(/\/\s*([\d.]+)\s*m/)
  return m ? parseFloat(m[1]) : 999
}

export function fmtNum(n) {
  if (n == null) return '—'
  return Number(String(n).replace(/,/g, '')).toLocaleString()
}
