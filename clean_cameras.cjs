/**
 * clean_cameras.cjs  v2
 *
 * One row per distinct camera model. Non-canonical rows have their
 * B&H price/URL saved to retail_prices (as a labelled variant) before deletion
 * so the product page can still surface them.
 *
 * Run: node clean_cameras.cjs [--dry-run]
 */
'use strict'

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://lzkdewuwrshiqjjndszx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0'

const DRY_RUN = process.argv.includes('--dry-run')
const sb      = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Name normalisation (applied before base-model extraction) ───────────────
// Collapses naming variations that mean the same camera model into a common form.
const NAME_NORMALISATIONS = [
  // "Digital Cine Camera" → "Digital Cinema Camera"
  [/\bDigital\s+Cine\s+Camera\b/gi, 'Digital Cinema Camera'],
  // "Mirrorless Cine Camera" → "Mirrorless Cinema Camera"
  [/\bMirrorless\s+Cine\s+Camera\b/gi, 'Mirrorless Cinema Camera'],
  // RED DSMC3 prefix is just the camera system name, not a model differentiator
  [/\bDSMC3\s+/gi, ''],
  // RED: "Z Mount 6K Digital Cinema Camera" → "6K Digital Cinema Camera"  (Z Mount is an adapter, not a model)
  [/\bZ\s+Mount\s+(\d)/gi, '$1'],
  // RED: "[X]" and "XL [X]" — normalise bracket style "[X]" → just marker kept as-is (leave alone)
  // Canon: "6K Camera" when it means "6K Full-Frame Digital Cinema Camera" — handled by base-match below
  // Sony BURANO: "Motion Picture Camera" = "Cinema Camera"
  [/\bMotion\s+Picture\s+Camera\b/gi, 'Cinema Camera'],
  // Kinefinity: strip "LF " prefix that sometimes appears inconsistently → handled by base-match
  // Sensor Camera → Camera (redundant suffix)
  [/\bSensor\s+Camera\b/gi, 'Camera'],
]

// ─── Trailing camera-type suffix strip ───────────────────────────────────────
// Removes redundant type descriptors from the END of camera names so every
// camera in the DB has a clean model-identity name with no "Digital Cinema
// Camera", "Mirrorless Camera", "Full-Frame Camera" etc. appended.
// "Pocket Cinema Camera" is exempt — that IS the Blackmagic product line name.
const CAMERA_TYPE_SUFFIX_STRIPS = [
  // Resolution + type compound suffixes (Z CAM / Kinefinity style)
  /\s+Professional \d+\.?\d*K (?:Digital )?Cinema Camera$/i,
  /\s+Super 35 \d+\.?\d*K (?:Digital )?Cinema Camera$/i,
  /\s+S35 \d+\.?\d*K (?:Digital )?Cinema Camera$/i,
  /\s+Full[- ]Frame \d+\.?\d*K (?:Digital )?Cinema Camera$/i,
  // Full-frame compound
  /\s+Full[- ]Frame (?:Digital )?Cinema Camera$/i,
  /\s+Full[- ]Frame Camera$/i,
  // Medium format
  /\s+Medium Format (?:Mirrorless |DSLR |Digital )?Camera$/i,
  // Cinema variants
  /\s+Digital Cinema Camera$/i,
  /\s+Mirrorless Cinema Camera$/i,
  /\s+Cinema Camera$/i,
  // Specific type + Camera
  /\s+Cinema Line PTZ Camera$/i,
  /\s+(?:Digital )?Rangefinder Camera$/i,
  /\s+Mirrorless Camera$/i,
  /\s+DSLR Camera$/i,
  /\s+Digital Camera$/i,
  /\s+Instant Camera$/i,
  /\s+High[- ]Speed Camera$/i,
  /\s+(?:4K )?(?:NDI )?Studio Camera$/i,
  /\s+(?:Multipurpose )?Box Camera$/i,
  /\s+Industrial Camera$/i,
  /\s+NDI Camera$/i,
  /\s+360[°]? Camera$/i,
  /\s+PTZ Camera$/i,
  /\s+Camera$/i,   // catch-all trailing "Camera"
  /\s+DSLR$/i,     // standalone trailing DSLR without "Camera"
]

function stripCameraTypeSuffix(name) {
  if (/\bPocket Cinema Camera\b/i.test(name)) return name
  for (const pat of CAMERA_TYPE_SUFFIX_STRIPS) {
    const stripped = name.replace(pat, '').trim()
    if (stripped !== name) return stripped
  }
  return name
}

function normaliseName(name) {
  let n = name
  for (const [re, rep] of NAME_NORMALISATIONS) n = n.replace(re, rep).replace(/\s{2,}/g, ' ').trim()
  n = stripCameraTypeSuffix(n)
  return n
}

// ─── stripCameraConfig ───────────────────────────────────────────────────────
const ARRI_CINEMA_MODELS = ['ALEXA Mini LF', 'ALEXA LF', 'ALEXA Mini', 'ALEXA 35', 'AMIRA']

// Config keywords that mark where the config suffix starts.
// "Starter", "Pack", "Essentials", "Monitor", "Monitoring" handle camera bundles/kits.
// "Z Mount" is already removed by normalisation above.
// NOTE: avoid standalone "System\b" — it false-positives on "OM SYSTEM" (brand name).
// Compound forms like "(?:Entry|Standard|Pro) System" are handled by the prefix group.
const CONFIG_BREAK_RE = /\s+(XTREME\b|Lightweight\b|Premium\b|Basic\b|Live\b|Body\b|Production\b|Operator\b|Creator\b|Camera\s+Set\b|Base\b|(?:Entry|Standard|Pro)\s+(?:Set|System)\b|Starter\b|Essentials?\b|Monitoring?\b|Kit\b|Pack\b|Package\b|Set\b|with\b|and\b)/i

function stripCameraConfig(rawName) {
  const name = normaliseName(rawName)
  if (!name) return { baseModel: rawName || '', configLabel: '' }

  // ── ARRI: known model lookup ──────────────────────────────────────
  if (/^ARRI\s/.test(name)) {
    const bundleMatch = name.match(
      /^ARRI\s+(\d+\s*x\s+.+?)\s*&\s*(ALEXA(?:\s+(?:35|Mini\s+LF|Mini|LF))?|AMIRA)\s*(.*?)\s*$/i
    )
    if (bundleMatch) {
      const [, lensDesc, model, rest] = bundleMatch
      return {
        baseModel:   `ARRI ${model.trim()}`,
        configLabel: [lensDesc.trim(), rest.trim()].filter(Boolean).join(' '),
      }
    }
    for (const model of ARRI_CINEMA_MODELS) {
      const idx = name.indexOf(model)
      if (idx >= 0) {
        return { baseModel: `ARRI ${model}`, configLabel: name.slice(idx + model.length).trim() }
      }
    }
  }

  // ── Generic two-pass: paren strip → keyword strip ─────────────────
  let working = name, parenSuffix = ''
  const parenMatch = working.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (parenMatch) { working = parenMatch[1].trim(); parenSuffix = parenMatch[2].trim() }

  const kwMatch = working.match(CONFIG_BREAK_RE)
  if (kwMatch && kwMatch.index > 0) {
    const configPart = working.slice(kwMatch.index).trim()
    working = working.slice(0, kwMatch.index).trim()
    const configLabel = parenSuffix ? `${configPart} (${parenSuffix})` : configPart
    if (working.split(/\s+/).length >= 2) return { baseModel: working, configLabel }
  }

  if (parenSuffix && working.split(/\s+/).length >= 2) {
    return { baseModel: working, configLabel: parenSuffix }
  }

  return { baseModel: name, configLabel: '' }
}

// ─── Always-delete entries ────────────────────────────────────────────────────
// Items that are definitively not cameras (lens accessories, bad scrapes, etc.)
// These are deleted with their related records before grouping runs.
const ALWAYS_DELETE = new Set([
  'RED DIGITAL CINEMA KOMODO-X Z Mount Power Zoom Pack', // lens accessory bundle, not a camera
  'RED DIGITAL CINEMA',                                   // truncated/bad scrape — no model info
  'Blackmagic Design Film/Music Video',                   // not a camera
  'Sony VENICE 6K Camera',                                // EDU/base kit bundle (venice1basekit_edu), not standalone
  'Sony VENICE 4K',                                       // 4K Live Bundle (venice4klive), not standalone
  'Blackmagic Design URSA Cine 12K LF 100G',             // 100G SFP+ connectivity variant — merged into base LF
  'Blackmagic Design URSA Cine 12K LF 100G Camera (Body Only, Canon EF)',    // 100G mount variant
  'Blackmagic Design URSA Cine 12K LF 100G Camera (ARRI PL, Canon EF)',     // 100G mount variant
  'Blackmagic Design URSA Cine 12K LF 100G Camera + Cine EVF (ARRI PL, Canon EF)', // 100G bundle
  'Blackmagic Design URSA Cine Immersive 100G',           // 100G SFP+ connectivity variant — merged into base
  'Blackmagic Design URSA Cine Immersive 100G Camera',    // 100G variant (with "Camera" suffix)
  'FREEFLY Ember S5K Camera',                             // dupe of FREEFLY Ember S5K (already clean name)
  'RED DIGITAL CINEMA KOMODO-X Production Pack with Rigid-Hinge Touch 7.0 (Gold Mount)', // production kit, not standalone
  'RED DIGITAL CINEMA V-RAPTOR XE Cine Essentials Pack (Nikon Z)',           // kit, not standalone
])

// ─── Additional manual merge rules ──────────────────────────────────────────
// Some cameras have naming inconsistencies that normalisation alone can't bridge.
// Map a raw DB name → the canonical base name it should merge into.
const MANUAL_MERGE = {
  // Canon C80 kits
  'Canon EOS C80 6K Camera':              'Canon EOS C80 6K Full-Frame Cinema Camera',
  'Canon EOS C80 Cinema Camera':          'Canon EOS C80 6K Full-Frame Cinema Camera',
  // Canon C400 kits
  'Canon EOS C400 6K Camera':             'Canon EOS C400 6K Full-Frame Digital Cinema Camera',
  // Canon R5 C — "Cine" vs "Cinema" + VR kit
  'Canon EOS R5 C Mirrorless Cine Camera':'Canon EOS R5 C Mirrorless Cinema Camera',
  'Canon EOS R5 C VR':                    'Canon EOS R5 C Mirrorless Cinema Camera',
  // Canon 6D II duplicate ("DSLR Camera" vs "DSLR")
  'Canon EOS 6D Mark II DSLR Camera':     'Canon EOS 6D Mark II DSLR',
  // Kinefinity name drift — all LF variants → canonical Mark2 6K LF
  'Kinefinity MAVO Edge 8K Camera':                           'Kinefinity MAVO Edge 8K Digital Cinema Camera',
  'Kinefinity MAVO mark2 LF Digital Camera':                  'Kinefinity MAVO Mark2 6K LF Digital Cinema Camera',
  'Kinefinity MAVO mark2 LF Digital Cine Camera':             'Kinefinity MAVO Mark2 6K LF Digital Cinema Camera',
  'Kinefinity MAVO mark2 6K LF Digital Cinema Camera':        'Kinefinity MAVO Mark2 6K LF Digital Cinema Camera',
  'Kinefinity MAVO mark 2 6K LF Digital Cinema Camera':       'Kinefinity MAVO Mark2 6K LF Digital Cinema Camera',
  'Kinefinity MAVO mark2 LF Digital Cinema Camera':           'Kinefinity MAVO Mark2 6K LF Digital Cinema Camera',
  // Kinefinity S35 variants → canonical Mark2 6K S35
  'Kinefinity MAVO mark2 6K S35 Digital Cine Camera':                   'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO mark2 6K S35 Digital Cinema Camera':                 'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO mark2 6K S35 Digital Cinema Camera (KineMOUNT)':     'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO mark2 S35 Digital Cinema Camera':                    'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO mark2 S35 Digital Cinema Camera (KineMOUNT)':        'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO mark2 S35 Digital Cinema Camera (Sony E)':           'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO Mark2 S35 Digital Cinema Camera':                    'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity MAVO Mark2 S35 Digital Cinema Camera (ARRI PL)':          'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity mark2 6K S35 Digital Cinema Camera':                      'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity mark2 6K S35 Digital Cinema Camera (Active E Mount)':     'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  'Kinefinity mark2 6K S35 Digital Cinema Camera (Active PL Mount)':    'Kinefinity MAVO Mark2 6K S35 Digital Cinema Camera',
  // Sony FX6 variants → canonical Full-Frame name
  'Sony FX6 Digital Cinema Camera':                           'Sony FX6 Full-Frame Cinema Camera',
  // Blackmagic — strip redundant "Camera" / "Cinema Camera" / "Cinema Box Camera" suffixes
  // Paren-suffixed mount variants (raw DB names from B&H scrape) must also be listed
  'Blackmagic Design PYXIS 12K Cinema Camera':                     'Blackmagic Design PYXIS 12K',
  'Blackmagic Design PYXIS 12K Cinema Camera (Canon EF)':          'Blackmagic Design PYXIS 12K',
  'Blackmagic Design PYXIS 12K Cinema Camera (Leica L)':           'Blackmagic Design PYXIS 12K',
  'Blackmagic Design PYXIS 6K Cinema Box Camera':                  'Blackmagic Design PYXIS 6K',
  'Blackmagic Design PYXIS 6K Cinema Box Camera (Leica L)':        'Blackmagic Design PYXIS 6K',
  'Blackmagic Design PYXIS 6K Cinema Box Camera (ARRI PL)':        'Blackmagic Design PYXIS 6K',
  'Blackmagic Design URSA Cine 12K LF Camera':                     'Blackmagic Design URSA Cine 12K LF',
  'Blackmagic Design URSA Cine 12K LF Camera (PL Mount)':          'Blackmagic Design URSA Cine 12K LF',
  'Blackmagic Design URSA Cine 12K LF 100G Camera':                'Blackmagic Design URSA Cine 12K LF 100G',
  'Blackmagic Design URSA Cine Immersive Camera':                  'Blackmagic Design URSA Cine Immersive',
  'Blackmagic Design URSA Cine Immersive 100G Camera':             'Blackmagic Design URSA Cine Immersive 100G',
  'Blackmagic Design URSA Mini Pro 4.6K G2 Digital Cinema Camera': 'Blackmagic Design URSA Mini Pro 4.6K G2',
  // Blackmagic 17K naming drift
  'Blackmagic Design URSA Cine 17K 65 Camera': 'Blackmagic Design URSA Cine 17K 65',
  'Blackmagic Design URSA Cine 17K 65 Camera and URSA Cine EVF': 'Blackmagic Design URSA Cine 17K 65',
  // Blackmagic 4K — same camera, different B&H port-config listing
  'Blackmagic Design Pocket Cinema Camera 4K/HDMI': 'Blackmagic Design Pocket Cinema Camera 4K',
  // Blackmagic 6K — merge all variants into one entry
  'Blackmagic Design Cinema Camera 6K':              'Blackmagic Design Pocket Cinema Camera 6K',
  'Blackmagic Design Cinema Camera 6K (Leica L)':   'Blackmagic Design Pocket Cinema Camera 6K',
  'Blackmagic Design Pocket Cinema Camera 6K G2':   'Blackmagic Design Pocket Cinema Camera 6K',
  'Blackmagic Design Pocket Cinema Camera 6K Pro':  'Blackmagic Design Pocket Cinema Camera 6K',
  'Blackmagic Design Pocket Cinema Camera 6K Pro (Canon EF)': 'Blackmagic Design Pocket Cinema Camera 6K',
  // OM SYSTEM colour variant
  'OM SYSTEM OM-5 Mark II Mirrorless Camera (Sand Beige)': 'OM SYSTEM OM-5 Mark II Mirrorless Camera',
  // Panasonic S9 kit
  'Panasonic LUMIX S9 Mirrorless Camera and 18-40mm f/4.5-6.3': 'Panasonic LUMIX S9 Mirrorless Camera',
  // Sony BURANO already normalised by NAME_NORMALISATIONS
  'Sony BURANO 8K Digital Cinema Camera': 'Sony BURANO 8K Digital Cinema Camera',
  // Sony VENICE 2 naming variants
  'Sony VENICE 2':                         'Sony VENICE 2 Digital Cinema Camera',
  'Sony VENICE 2 Camera Package':          'Sony VENICE 2 Digital Cinema Camera',
  // RED KOMODO starter packs / kits
  'RED DIGITAL CINEMA KOMODO 6K Camera Starter Pack':   'RED DIGITAL CINEMA KOMODO 6K Digital Cinema Camera',
  'RED DIGITAL CINEMA KOMODO-X 6K Camera Starter Pack': 'RED DIGITAL CINEMA KOMODO-X 6K Digital Cinema Camera',
  'RED DIGITAL CINEMA KOMODO-X':                         'RED DIGITAL CINEMA KOMODO-X 6K Digital Cinema Camera',
  'RED DIGITAL CINEMA KOMODO-X Z Mount':                 'RED DIGITAL CINEMA KOMODO-X 6K Digital Cinema Camera',
  // RED V-RAPTOR [X] 8K VV — production systems and Z Mount variants
  'RED DIGITAL CINEMA V-RAPTOR [X] 8K VV':               'RED DIGITAL CINEMA V-RAPTOR [X] 8K VV Camera',
  'RED DIGITAL CINEMA V-RAPTOR [X] 8K VV Starter Pack':  'RED DIGITAL CINEMA V-RAPTOR [X] 8K VV Camera',
  'RED DIGITAL CINEMA V-RAPTOR [X] Z Mount':              'RED DIGITAL CINEMA V-RAPTOR [X] 8K VV Camera',
  'RED DIGITAL CINEMA V-RAPTOR [X] Z Mount Starter Pack': 'RED DIGITAL CINEMA V-RAPTOR [X] 8K VV Camera',
  // RED V-RAPTOR 8K S35 — production system and starter pack
  'RED DIGITAL CINEMA V-RAPTOR 8K S35':                   'RED DIGITAL CINEMA V-RAPTOR 8K S35 Camera',
  'RED DIGITAL CINEMA V-RAPTOR 8K S35 Starter Pack':      'RED DIGITAL CINEMA V-RAPTOR 8K S35 Camera',
  // RED V-RAPTOR XE — Cine Essentials Pack
  'RED DIGITAL CINEMA V-RAPTOR XE Cine Essentials Pack':  'RED DIGITAL CINEMA V-RAPTOR XE 8K VV Camera',
  // RED V-RAPTOR XL [X] 8K VV production system
  'RED DIGITAL CINEMA V-RAPTOR XL [X] 8K VV':             'RED DIGITAL CINEMA V-RAPTOR XL [X] 8K VV Camera',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function deleteRelated(ids) {
  if (!ids.length) return
  const tables = ['retail_prices', 'retailer_urls', 'rental_entries', 'price_entries']
  for (const tbl of tables) {
    const { error } = await sb.from(tbl).delete().in('product_id', ids).eq('product_table', 'cameras')
    if (error && !error.message.includes('does not exist')) {
      console.warn(`    [warn] ${tbl} delete: ${error.message}`)
    }
  }
}

// Save variant B&H price + URL to retail_prices/retailer_urls so product
// pages can show all configurations in the Buy New section.
// Uses delete-then-insert to avoid needing a unique constraint.
async function saveVariantAsRetailPrice(canonicalId, variant, configLabel) {
  if (!variant.price && !variant.bhphoto_url) return

  // Build a descriptive retailer label, e.g. "B&H Photo (Starter Pack)" or "B&H Photo"
  const retailer = configLabel
    ? `B&H Photo (${configLabel.slice(0, 60)})`
    : 'B&H Photo'

  if (variant.price) {
    // Delete any existing entry for this retailer label, then insert fresh
    await sb.from('retail_prices').delete()
      .eq('product_table', 'cameras')
      .eq('product_id', canonicalId)
      .eq('retailer', retailer)
    const { error } = await sb.from('retail_prices').insert({
      product_table: 'cameras',
      product_id:    canonicalId,
      retailer,
      price:         variant.price,
      currency:      'USD',
      in_stock:      true,
    })
    if (error) console.warn(`    [warn] retail_prices insert: ${error.message}`)
  }

  if (variant.bhphoto_url) {
    await sb.from('retailer_urls').delete()
      .eq('product_table', 'cameras')
      .eq('product_id', canonicalId)
      .eq('retailer', retailer)
    const { error } = await sb.from('retailer_urls').insert({
      product_table: 'cameras',
      product_id:    canonicalId,
      retailer,
      url:           variant.bhphoto_url,
    })
    if (error && !error.message.includes('does not exist')) {
      console.warn(`    [warn] retailer_urls insert: ${error.message}`)
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===')

  const { data: cameras, error } = await sb
    .from('cameras').select('id,name,brand,price,bhphoto_url').order('name')
  if (error) { console.error('Fetch failed:', error.message); process.exit(1) }
  console.log(`Fetched ${cameras.length} camera rows`)

  // Build name→id map for quick lookup
  const byName = new Map(cameras.map(c => [c.name, c]))

  // ── Always-delete entries ────────────────────────────────────────────────
  const alwaysDeleteItems = cameras.filter(c => ALWAYS_DELETE.has(c.name))
  if (alwaysDeleteItems.length) {
    console.log(`\nAlways-delete (${alwaysDeleteItems.length} rows — not cameras):`)
    alwaysDeleteItems.forEach(c => console.log(`  [${c.id}] "${c.name}"`))
    if (!DRY_RUN) {
      const ids = alwaysDeleteItems.map(c => c.id)
      await deleteRelated(ids)
      const { error } = await sb.from('cameras').delete().in('id', ids)
      if (error) console.error('  ERROR:', error.message)
    }
    console.log()
  }

  // Exclude always-delete rows from grouping
  const camerasToGroup = cameras.filter(c => !ALWAYS_DELETE.has(c.name))

  // Group by base model, applying manual overrides first
  const groups = new Map()
  for (const cam of camerasToGroup) {
    let key
    if (MANUAL_MERGE[cam.name]) {
      // Manually mapped to a canonical name
      key = MANUAL_MERGE[cam.name]
    } else {
      key = stripCameraConfig(cam.name).baseModel || cam.name
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(cam)
  }

  console.log(`Found ${groups.size} distinct base models\n`)

  let renamed = 0, deleted = 0, skipped = 0

  for (const [baseModel, variants] of groups) {
    if (variants.length === 1 && variants[0].name === baseModel) {
      skipped++; continue
    }

    // Non-refurbished first, then lowest price, then alpha
    variants.sort((a, b) => {
      const aRef = /refurb/i.test(a.name), bRef = /refurb/i.test(b.name)
      if (aRef !== bRef) return aRef ? 1 : -1
      // Prefer rows whose raw name is the base model (already clean)
      const aClean = a.name === baseModel, bClean = b.name === baseModel
      if (aClean !== bClean) return aClean ? -1 : 1
      const ap = a.price ?? Infinity, bp = b.price ?? Infinity
      if (ap !== bp) return ap - bp
      return a.name.localeCompare(b.name)
    })

    // If the base model name already exists as a row, prefer it as canonical
    let canonical = byName.get(baseModel) && variants.find(v => v.name === baseModel)
    if (!canonical) canonical = variants[0]
    const toDelete = variants.filter(v => v.id !== canonical.id)

    const needRename = canonical.name !== baseModel
    const minPrice   = variants.reduce((m, v) => v.price != null ? Math.min(m, v.price) : m, Infinity)
    const priceToSet = isFinite(minPrice) ? minPrice : null

    console.log(`→ ${baseModel}  (${variants.length} rows)`)
    if (needRename)  console.log(`  rename: "${canonical.name}" → "${baseModel}"`)
    if (priceToSet !== canonical.price) console.log(`  price: ${canonical.price} → ${priceToSet}`)
    if (toDelete.length) console.log(`  delete ${toDelete.length}: ${toDelete.map(v => `"${v.name}"`).join(', ')}`)

    if (!DRY_RUN) {
      // Save variant prices/URLs to retail_prices before deleting
      for (const v of toDelete) {
        if (v.price || v.bhphoto_url) {
          const configLabel = stripCameraConfig(v.name).configLabel || v.name.replace(baseModel, '').trim()
          await saveVariantAsRetailPrice(canonical.id, v, configLabel)
        }
      }

      // Delete related records then the rows
      const deleteIds = toDelete.map(v => v.id)
      await deleteRelated(deleteIds)
      if (deleteIds.length) {
        const { error: delErr } = await sb.from('cameras').delete().in('id', deleteIds)
        if (delErr) { console.error(`  ERROR: ${delErr.message}`); continue }
        deleted += deleteIds.length
      }

      // Update canonical
      const updates = {}
      if (needRename) updates.name = baseModel
      if (priceToSet != null && priceToSet !== canonical.price) updates.price = priceToSet
      if (Object.keys(updates).length) {
        const { error: upErr } = await sb.from('cameras').update(updates).eq('id', canonical.id)
        if (upErr) console.error(`  ERROR updating: ${upErr.message}`)
        else renamed++
      }
    }
  }

  console.log(`\nDone. renamed=${renamed} deleted=${deleted} skipped=${skipped}`)
  if (DRY_RUN) console.log('(dry run — re-run without --dry-run to apply)')
}

main().catch(e => { console.error(e); process.exit(1) })
