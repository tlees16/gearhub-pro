// ─── Product variant name stripping ───────────────────────────────────────────
// Strips configuration/variant suffixes from product names to get the base model.
// Used to group product variants together and clean up display names.

const ARRI_CINEMA_MODELS = ['ALEXA Mini LF', 'ALEXA LF', 'ALEXA Mini', 'ALEXA 35', 'AMIRA']

const CAMERA_BREAK =
  /\s+(XTREME\b|Lightweight\b|Premium\b|Basic\b|Live\b|Body\b|Production\b|Operator\b|Creator\b|Camera\s+Set\b|Base\b|(?:Entry|Standard|Pro)\s+(?:Set|System)\b|Kit\b|Set\b|System\b|with\b)/i

const LIGHTING_BREAK =
  /\s+(Lamp\s+Head\b|Control\s+Box\b|BLAIR-?CG\b|Hurricane\b|RGB\s+LED\b|with(?:out)?\b|Kit\b|Set\b|Travel\b)/i

const LENS_BREAK = /\s+(for\b|with\b|Kit\b|Set\b)/i

function genericStrip(
  name: string,
  breakRe: RegExp,
): { baseModel: string; configLabel: string } {
  let working = name
  let parenSuffix = ''

  const parenMatch = working.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (parenMatch) {
    working = parenMatch[1].trim()
    parenSuffix = parenMatch[2].trim()
  }

  const kwMatch = working.match(breakRe)
  if (kwMatch && kwMatch.index != null && kwMatch.index > 0) {
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

export function stripProductVariant(
  name: string,
  category: string,
): { baseModel: string; configLabel: string } {
  if (!name) return { baseModel: '', configLabel: '' }

  if (category === 'cameras') {
    if (/^ARRI\s/.test(name)) {
      const bundleMatch = name.match(
        /^ARRI\s+(\d+\s*x\s+.+?)\s*&\s*(ALEXA(?:\s+(?:35|Mini\s+LF|Mini|LF))?|AMIRA)\s*(.*?)\s*$/i,
      )
      if (bundleMatch) {
        const [, lensDesc, model, rest] = bundleMatch
        return {
          baseModel: `ARRI ${model.trim()}`,
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
    return genericStrip(name, CAMERA_BREAK)
  }

  if (category === 'lighting') return genericStrip(name, LIGHTING_BREAK)
  if (category === 'lenses') return genericStrip(name, LENS_BREAK)

  return { baseModel: name, configLabel: '' }
}

// Count fc/ measurements as a proxy for photometric data richness
export function countPhotometricMeasurements(s: string | null | undefined): number {
  if (!s) return 0
  return (s.match(/fc\s*\//g) ?? []).length
}
