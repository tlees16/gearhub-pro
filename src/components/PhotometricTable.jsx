'use client'

import { useState } from 'react'
import { Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { parsePhotometrics, configLabel, toMeters, fmtNum } from '../services/photometrics'

function unique(arr) { return [...new Set(arr)] }

// ─── Build pivot sections ─────────────────────────────────────────────────────
export function buildSections(rows) {
  // Assign config label to each row
  const labeled = rows.map(r => ({ ...r, config: configLabel(r.angle, r.modifier) }))

  // Group by CCT preserving order
  const cctOrder = unique(labeled.map(r => r.cct || '—'))
  const byCCT = {}
  for (const r of labeled) {
    const k = r.cct || '—'
    if (!byCCT[k]) byCCT[k] = []
    byCCT[k].push(r)
  }

  // ── Special case: all CCTs have exactly one distance and one config
  // → Collapse into one CCT-comparison table
  const allOneRow = cctOrder.every(cct => {
    const g = byCCT[cct]
    return unique(g.map(r => r.distance)).length === 1 &&
           unique(g.map(r => r.config)).length === 1
  })
  if (cctOrder.length > 1 && allOneRow) {
    return [{ type: 'cct-compare', rows: cctOrder.map(cct => byCCT[cct][0]) }]
  }

  // ── Standard sections: one per CCT ──────────────────────────────────────────
  const sections = cctOrder.map(cct => {
    const cctRows = byCCT[cct]
    const configs   = unique(cctRows.map(r => r.config))
    const distances = unique(cctRows.map(r => r.distance)).sort((a, b) => toMeters(a) - toMeters(b))
    const multiConf = configs.length > 1

    const tableRows = distances.map(dist => {
      const cells = multiConf
        ? configs.map(cfg => {
            const match = cctRows.find(r => r.distance === dist && r.config === cfg)
            return match ? { fc: match.fc, lux: match.lux } : null
          })
        : [(() => { const m = cctRows.find(r => r.distance === dist); return m ? { fc: m.fc, lux: m.lux } : null })()]
      return { distance: dist, cells }
    })

    // When single config and it's not an Open Face variant, surface the label so it's visible
    const isOpenFace = !multiConf && (configs[0] === 'Open Face' || configs[0].endsWith(' Open Face'))
    const singleConfig = (!multiConf && !isOpenFace) ? configs[0] : null

    return {
      type: 'standard',
      cct:  cct === '—' ? null : cct,
      configs: multiConf ? configs : null,
      singleConfig,
      tableRows,
    }
  })

  // If every section shows the same singleConfig, lift it to a global note and
  // clear per-section so it isn't repeated next to every CCT label.
  const perSectionConfigs = sections.map(s => s.singleConfig).filter(Boolean)
  const uniquePerSection = [...new Set(perSectionConfigs)]
  let globalConfig = null
  if (uniquePerSection.length === 1 && sections.length > 1) {
    globalConfig = uniquePerSection[0]
    sections.forEach(s => { s.singleConfig = null })
  }

  return { sections, globalConfig }
}

// ─── CCT color ────────────────────────────────────────────────────────────────
export function cctColor(cct) {
  if (!cct) return 'text-slate-400'
  const k = parseInt(cct)
  if (k <= 3200) return 'text-amber-400'
  if (k <= 4500) return 'text-yellow-300'
  return 'text-sky-300'
}

// ─── Config column colour ─────────────────────────────────────────────────────
export const CONFIG_COLORS = [
  'text-slate-300',
  'text-indigo-300',
  'text-emerald-300',
  'text-amber-300',
]

// ─── Table component ──────────────────────────────────────────────────────────
export function PivotTable({ configs, tableRows }) {
  const colCount = tableRows[0]?.cells.length || 1

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800/30">
      <table className="w-full text-[12px]">
        <thead>
          {/* Config group headers (only if pivoting) */}
          {configs && (
            <tr className="bg-slate-800/40 border-b border-slate-700/30">
              <th className="px-4 py-2" />
              {configs.map((cfg, ci) => (
                <th key={cfg} colSpan={2}
                  className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide border-l border-slate-700/30 ${CONFIG_COLORS[ci % CONFIG_COLORS.length]}`}>
                  {cfg}
                </th>
              ))}
            </tr>
          )}
          {/* fc / Lux subheaders */}
          <tr className="bg-slate-800/25">
            <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Distance
            </th>
            {Array.from({ length: colCount }).map((_, ci) => (
              <>
                <th key={`fc-${ci}`} className={`px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest ${ci > 0 ? 'border-l border-slate-800/30' : ''}`}>
                  fc
                </th>
                <th key={`lux-${ci}`} className="px-4 py-2 text-right text-[10px] font-semibold text-indigo-400/60 uppercase tracking-widest">
                  Lux
                </th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, ri) => (
            <tr key={ri} className={`border-t border-slate-800/20 ${ri % 2 !== 0 ? 'bg-slate-800/10' : ''}`}>
              <td className="px-4 py-2.5 text-slate-400 font-mono tabular-nums text-[11px] whitespace-nowrap">
                {row.distance}
              </td>
              {row.cells.map((cell, ci) => (
                <>
                  <td key={`fc-${ci}`} className={`px-4 py-2.5 text-right font-mono tabular-nums text-slate-200 ${ci > 0 ? 'border-l border-slate-800/20' : ''}`}>
                    {cell ? fmtNum(cell.fc) : '—'}
                  </td>
                  <td key={`lux-${ci}`} className="px-4 py-2.5 text-right font-mono tabular-nums text-indigo-300">
                    {cell ? fmtNum(cell.lux) : '—'}
                  </td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PhotometricTable({ product }) {
  const [open, setOpen] = useState(false)

  if (product.category !== 'lighting') return null

  // Try all candidate fields — capital-P from specs_json, lowercase direct columns
  const candidates = [
    product.allSpecs?.['Photometrics'],
    product.allSpecs?.['photometrics'],
    product.allSpecs?.['photometrics_at_3_3_1_m'],
  ].filter(s => s && typeof s === 'string')

  let parsed = null
  for (const raw of candidates) {
    const p = parsePhotometrics(raw)
    if (p && (!parsed || p.rows.length > parsed.rows.length)) parsed = p
  }

  if (!parsed) return null
  const { sections, globalConfig } = buildSections(parsed.rows)

  return (
    <section className="bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/20 transition-colors duration-200"
      >
        <div className="flex items-center gap-2.5">
          <Zap size={14} className="text-amber-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">Photometrics</h2>
          <span className="text-[10px] text-slate-600 font-light">
            {parsed.rows.length} measurement{parsed.rows.length !== 1 ? 's' : ''}
          </span>
          {globalConfig && (
            <span className="text-[10px] text-slate-600 font-light">· {globalConfig}</span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} className="text-slate-500" />
          : <ChevronDown size={14} className="text-slate-500" />
        }
      </button>

      {open && <div className="px-6 py-5 space-y-6 border-t border-slate-800/25">
        {sections.map((section, si) => {

          // CCT comparison (e.g. Genaray: multiple CCTs, one distance each)
          if (section.type === 'cct-compare') {
            return (
              <div key={si} className="rounded-xl overflow-hidden border border-slate-800/30">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-800/25">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">CCT</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Distance</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">fc</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-indigo-400/60 uppercase tracking-widest">Lux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, ri) => (
                      <tr key={ri} className={`border-t border-slate-800/20 ${ri % 2 !== 0 ? 'bg-slate-800/10' : ''}`}>
                        <td className={`px-4 py-2.5 font-semibold tabular-nums ${cctColor(row.cct)}`}>{row.cct || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono tabular-nums text-[11px]">{row.distance}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-200">{fmtNum(row.fc)}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-indigo-300">{fmtNum(row.lux)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          // Standard section (one per CCT)
          return (
            <div key={si}>
              {(section.cct || section.singleConfig) && (
                <div className="flex items-center gap-2 mb-2.5">
                  {section.cct && (
                    <span className={`text-[13px] font-bold tabular-nums ${cctColor(section.cct)}`}>
                      {section.cct}
                    </span>
                  )}
                  {section.singleConfig && (
                    <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {section.singleConfig}
                    </span>
                  )}
                  {section.configs && (
                    <span className="text-[10px] text-slate-600 font-light">
                      {section.configs.length} configurations
                    </span>
                  )}
                </div>
              )}
              <PivotTable configs={section.configs} tableRows={section.tableRows} />
            </div>
          )
        })}

        {parsed.footnotes.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-800/20">
            {parsed.footnotes.map((note, i) => (
              <p key={i} className="text-[10px] text-slate-600 font-light italic">* {note}</p>
            ))}
          </div>
        )}
      </div>}
    </section>
  )
}
