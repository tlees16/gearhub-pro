// AI-generated expert analysis for known products.
// Falls back to dynamic generation based on specs/category for unknown products.

const KNOWN_PRODUCTS = {
  // ── CAMERAS ──
  'Sony FX3': {
    description: 'The Sony FX3 is a compact full-frame cinema camera that bridges the gap between mirrorless photography and professional video production. Its thermal management system and cinema-centric ergonomics make it a go-to for indie filmmakers and solo shooters who need S35/FF image quality in a body small enough for gimbal work.',
    pros: ['Exceptional low-light performance (dual Base ISO)', 'Compact form factor ideal for gimbals and run-and-gun', 'Full HDMI output with no record limit', 'Built-in electronic variable ND (with accessory)'],
    cons: ['No internal RAW recording', 'Rolling shutter can be noticeable in fast pans', 'Limited built-in audio controls', 'No anamorphic desqueeze in-camera'],
    verdict: 88,
  },
  'Sony FX6': {
    description: 'The Sony FX6 is a versatile full-frame cinema camera designed for documentary and commercial production. It pairs Sony\'s renowned color science with a modular body that accepts PL and E-mount glass, making it the workhorse choice for DP owner-operators.',
    pros: ['Dual Base ISO (800/12800) for incredible low-light', 'Built-in electronic variable ND filter', 'Excellent autofocus with face/eye tracking', 'S-Cinetone and S-Log3 for flexible grading'],
    cons: ['4K 120fps limited to crop mode', 'No internal RAW (requires external recorder)', 'EVF sold separately', 'Menu system can be complex'],
    verdict: 91,
  },
  'Sony FX9': {
    description: 'The Sony FX9 is a full-frame flagship cinema camera built for high-end documentary, broadcast, and narrative production. Its 6K oversampled sensor delivers pristine 4K output with the rich highlight roll-off that colorists love.',
    pros: ['6K full-frame sensor with gorgeous color science', 'Dual Base ISO with class-leading dynamic range', 'Fast Hybrid AF that actually works for cinema', 'Robust build with extensive I/O'],
    cons: ['Large and heavy for solo shooters', 'Expensive proprietary batteries', 'No 6K RAW output without firmware update', 'Rolling shutter visible on fast movement'],
    verdict: 93,
  },
  'Sony BURANO': {
    description: 'The Sony BURANO is a high-end digital cinema camera bridging the gap between the FX series and the VENICE line. It brings 8.6K full-frame imaging with built-in ND filters and autofocus in a shoulder-mount form factor that punches well above its weight class.',
    pros: ['8.6K sensor with 16 stops of dynamic range', 'Built-in optical ND and Phase Detection AF', 'Dual Base ISO with clean, filmic images', 'PL and E-mount compatibility'],
    cons: ['Premium price point', 'Heavy for extended handheld work', 'Requires fast CFexpress media', 'Learning curve for Sony menu system'],
    verdict: 95,
  },
  'Sony VENICE 2': {
    description: 'The Sony VENICE 2 is the pinnacle of Sony\'s cinema camera lineup, featuring a swappable 8.6K full-frame sensor with breathtaking latitude and color rendition. It\'s the camera behind major studio productions, commercials, and prestige television series.',
    pros: ['8.6K full-frame with 16+ stops dynamic range', 'Swappable sensor block architecture', 'Industry-standard color science and X-OCN codec', 'Modular design for any production setup'],
    cons: ['Very high price point', 'Requires significant rigging and accessories', 'Heavy and bulky for documentary work', 'Steep learning curve'],
    verdict: 97,
  },
  'RED DSMC3 RAPTOR': {
    description: 'The RED RAPTOR is a powerhouse VV sensor camera delivering 8K resolution with RED\'s signature REDCODE RAW compression. It excels in VFX-heavy productions and high-end commercial work where resolution and dynamic range are paramount.',
    pros: ['8K VV sensor with stunning detail', 'REDCODE RAW with incredible compression efficiency', 'Global shutter eliminates rolling shutter artifacts', 'Modular RED ecosystem'],
    cons: ['Expensive body + accessory ecosystem', 'Requires RED-specific media', 'Power hungry — needs large batteries', 'Complex menu and workflow for newcomers'],
    verdict: 94,
  },
  'RED V-RAPTOR [X]': {
    description: 'The RED V-RAPTOR [X] represents the cutting edge of RED\'s sensor technology with a global shutter VV sensor delivering 8K footage with zero rolling shutter. Purpose-built for VFX, virtual production, and high-end cinema.',
    pros: ['True global shutter at 8K', 'Outstanding dynamic range for VFX work', 'Compact body for its sensor class', 'REDCODE RAW ecosystem'],
    cons: ['Premium price even by cinema camera standards', 'RED proprietary media costs add up', 'Heavy accessory dependency', 'Requires experienced RED workflow knowledge'],
    verdict: 95,
  },
  'RED KOMODO 6K': {
    description: 'The RED KOMODO 6K democratized RED ownership with a compact Super35 body shooting 6K REDCODE RAW. It\'s become the indie filmmaker\'s entry point into the RED ecosystem without sacrificing the RAW workflow professionals demand.',
    pros: ['Compact body with 6K REDCODE RAW', 'Global shutter for clean motion', 'Canon RF mount for affordable glass', 'Impressive dynamic range for its class'],
    cons: ['Super35 only — no full-frame option', 'Limited built-in I/O', 'CFast 2.0 media can be expensive', 'Touchscreen-only interface can frustrate'],
    verdict: 87,
  },
  'ARRI ALEXA 35': {
    description: 'The ARRI ALEXA 35 is the current gold standard of digital cinema cameras, featuring a new Super35 4.6K sensor with 17 stops of dynamic range. Its REVEAL Color Science and unmatched skin tone reproduction make it the default choice for top-tier productions worldwide.',
    pros: ['17 stops of dynamic range — best in class', 'REVEAL Color Science with legendary skin tones', 'Textures that feel organic and filmic', 'Built-in motorized ND system'],
    cons: ['Super35 only — no full-frame mode', 'Very expensive body and accessories', 'Lower resolution than RED/Sony competitors', 'ARRI proprietary workflow and media'],
    verdict: 97,
  },
  'ARRI ALEXA Mini LF': {
    description: 'The ARRI ALEXA Mini LF brings the large-format ARRI look into a compact, versatile body that\'s become the gold standard for high-end commercials and streaming series. Its organic image quality and reliable color science make it a DP favorite worldwide.',
    pros: ['Large format sensor with the iconic ARRI look', 'Compact enough for Steadicam and gimbal work', 'Rock-solid reliability on set', 'Native LPL and PL mount support'],
    cons: ['4.5K resolution is lower than competitors', 'Very high price point', 'ARRI Raw requires expensive recording', 'Heavy for its compact designation'],
    verdict: 96,
  },
  'ARRI AMIRA': {
    description: 'The ARRI AMIRA is a documentary and broadcast workhorse built on ARRI\'s ALEV III sensor. Its ergonomic shoulder-mount design, built-in ND filters, and ProRes recording make it the go-to for ENG crews and documentary cinematographers who need reliability.',
    pros: ['Legendary ARRI color science and skin tones', 'True shoulder-mount ergonomics', 'Built-in ND and excellent viewfinder', 'ProRes recording to affordable CFast media'],
    cons: ['Aging sensor compared to ALEXA 35', 'No RAW recording without license', '3.2K resolution is limiting for 4K deliverables', 'Being phased out of ARRI lineup'],
    verdict: 82,
  },
  'Canon EOS C70': {
    description: 'The Canon C70 is a Super35 cinema camera in a mirrorless-style body that makes Canon\'s Cinema EOS line accessible to hybrid shooters. Its Dual Gain Output sensor and RF mount open up a massive ecosystem of affordable glass.',
    pros: ['Compact RF-mount cinema body', 'Dual Pixel CMOS AF is industry-leading', 'Canon Log 3 with excellent skin tones', 'Built-in ND filters'],
    cons: ['Super35 crop in some modes', 'No RAW output without external recorder', '4K 120fps has a further crop', 'Limited dynamic range vs. ARRI/RED'],
    verdict: 85,
  },
  'Canon EOS C300 Mark III': {
    description: 'The Canon C300 Mark III features a Dual Gain Output Super35 sensor delivering 16 stops of dynamic range, making it Canon\'s most capable doc/commercial camera. Its modular design and Cinema RAW Light codec give colorists maximum flexibility.',
    pros: ['16 stops dynamic range with DGO sensor', 'Cinema RAW Light is efficient and flexible', 'Excellent Canon Dual Pixel AF', 'Modular design with extensive I/O'],
    cons: ['Super35 only — no full-frame', 'Large and heavy for run-and-gun', 'Expensive for Canon ecosystem', 'EF mount (PL optional) limits modern glass'],
    verdict: 88,
  },
  'Canon EOS C500 Mark II': {
    description: 'The Canon C500 Mark II is a full-frame cinema camera offering 5.9K capture with Canon\'s renowned color science and Dual Pixel AF. It serves as the bridge between Canon\'s accessible Cinema EOS line and high-end production demands.',
    pros: ['5.9K full-frame with Cinema RAW Light', 'Excellent Canon Dual Pixel AF in cinema body', 'Modular and expandable design', 'Rich Canon color science'],
    cons: ['Competitive market at this price point', 'Internal RAW has bitrate limitations', 'Heavy fully rigged', 'EVF unit sold separately'],
    verdict: 86,
  },
  'Blackmagic URSA Mini Pro 12K': {
    description: 'The Blackmagic URSA Mini Pro 12K is a resolution monster that captures 12K Blackmagic RAW at prices that undercut competitors by a wide margin. It\'s the value proposition king for VFX-heavy indie work and future-proofed archival.',
    pros: ['12K resolution at an incredible price point', 'Blackmagic RAW is efficient and powerful', 'Built-in ND filters', 'DaVinci Resolve Studio included'],
    cons: ['Massive file sizes even with BRAW', 'Requires fast and expensive storage', 'Autofocus is unreliable', 'Super35 sensor — not true large format'],
    verdict: 84,
  },
  'Blackmagic URSA Cine 12K': {
    description: 'The Blackmagic URSA Cine 12K is Blackmagic\'s flagship cinema camera featuring a new full-frame 12K sensor with open gate capability. It brings extreme resolution and Blackmagic\'s value proposition to the high-end cinema market.',
    pros: ['12K full-frame sensor at competitive pricing', 'Open gate shooting for maximum flexibility', 'Blackmagic RAW with DaVinci integration', 'Built-in gyroscope for post-stabilization'],
    cons: ['Brand new — limited real-world track record', 'Enormous data rates need fast storage', 'Limited autofocus capability', 'No established rental market yet'],
    verdict: 86,
  },
  'Blackmagic Pocket Cinema Camera 6K Pro': {
    description: 'The BMPCC 6K Pro packs a Super35 6K sensor into a remarkably affordable package with built-in NDs and a tiltable screen. It\'s the ultimate indie cinema camera for filmmakers who prioritize image quality per dollar.',
    pros: ['Incredible image quality for the price', 'Built-in ND filters (2/4/6 stop)', 'Blackmagic RAW and ProRes recording', 'DaVinci Resolve Studio license included'],
    cons: ['Poor battery life with LP-E6 batteries', 'Ergonomics require significant rigging', 'No autofocus worth using', 'Micro Four Thirds mount limits glass options'],
    verdict: 85,
  },
  'Panasonic LUMIX BS1H': {
    description: 'The Panasonic BS1H is a box-style full-frame cinema camera designed for multi-cam setups, live events, and tight spaces. Its compact form factor hides a surprisingly capable V-Log/V-Gamut pipeline with phase-detect AF.',
    pros: ['Full-frame sensor in ultra-compact box design', 'V-Log/V-Gamut with excellent dynamic range', 'Phase-detect AF with face/eye tracking', 'Versatile mounting options for rigs and drones'],
    cons: ['No built-in viewfinder or screen', 'Limited tactile controls', 'Niche form factor not for everyone', 'Rolling shutter can be significant'],
    verdict: 80,
  },

  // ── LENSES ──
  'Sony FE 24-70mm f/2.8 GM II': {
    description: 'Sony\'s second-generation G Master standard zoom sets a new benchmark for sharpness, autofocus speed, and weight in its class. It\'s the desert-island lens for Sony shooters who need one zoom to cover everything from doc to commercial.',
    pros: ['Razor sharp across the entire zoom range', 'Extremely fast and accurate AF', 'Remarkably lightweight for a 2.8 zoom', 'Excellent weather sealing'],
    cons: ['Premium G Master pricing', 'Slight focus breathing (improved but present)', 'f/2.8 may not be fast enough for all cinema work', 'No click-less aperture ring'],
    verdict: 94,
  },
  'Canon CN-E 70-200mm T4.4 L IS KAS S': {
    description: 'Canon\'s cinema 70-200mm brings L-series optics into a purpose-built cine housing with geared focus, iris, and zoom rings. Its image stabilization and parfocal design make it essential for documentary and broadcast telephoto work.',
    pros: ['Parfocal design — stays sharp throughout zoom', 'Built-in optical stabilization', 'Canon cinema color matching with other CN-E glass', 'Smooth, dampened focus and zoom rings'],
    cons: ['T4.4 is relatively slow for cinema glass', 'Heavy for extended handheld use', 'Expensive for a zoom lens', 'EF mount only — no RF cinema version yet'],
    verdict: 86,
  },
  'ARRI Signature Prime 47mm T1.8': {
    description: 'The ARRI Signature Prime 47mm is part of ARRI\'s flagship large-format prime set, engineered for the ALEXA Mini LF and ALEXA 35. Its rendering is painterly and organic, with a signature look that\'s become the aesthetic benchmark for prestige television.',
    pros: ['Stunning, organic image rendering', 'T1.8 with beautiful bokeh character', 'Large format coverage (46.31mm image circle)', 'Perfectly matched across the Signature set'],
    cons: ['Extremely expensive (rental-tier pricing)', 'LPL mount limits camera compatibility', 'Large and heavy for gimbal work', 'Overkill for Super35 sensors'],
    verdict: 96,
  },
  'Zeiss Supreme Prime 50mm T1.5': {
    description: 'The Zeiss Supreme Prime 50mm T1.5 is a full-frame cinema prime delivering Zeiss\'s signature clean, contrasty look with modern flare characteristics. It\'s a staple of commercial and narrative productions shooting on large-format sensors.',
    pros: ['T1.5 with clean, beautiful bokeh', 'Full-frame coverage for large format cameras', 'Lightweight for a full-frame cinema prime', 'Consistent look across Supreme Prime set'],
    cons: ['High price point for a single prime', 'Some find the look too clinical/clean', 'PL mount only — no EF option', 'Focus throw may be short for some pullers'],
    verdict: 93,
  },
  'Cooke S7/i 50mm T2.0': {
    description: 'The Cooke S7/i 50mm carries the legendary "Cooke Look" into full-frame territory — warm, dimensional, with creamy skin tones that have defined cinema for over a century. No other lens manufacturer renders human faces quite like Cooke.',
    pros: ['The iconic "Cooke Look" — warm and dimensional', 'Full-frame coverage with /i Technology metadata', 'Gorgeous skin tone rendering', 'Smooth focus and iris mechanics'],
    cons: ['Very expensive per lens', 'T2.0 is slower than some competitors', 'Heavy for a prime lens', 'Limited availability — long lead times'],
    verdict: 94,
  },
  'Sigma 18-35mm T2': {
    description: 'The Sigma 18-35mm T2 Cine is the rehoused version of Sigma\'s legendary Art zoom, offering an unprecedented T2 constant aperture across its zoom range. It\'s become the de facto standard zoom for Super35 indie and corporate production.',
    pros: ['T2 constant aperture across zoom range — unprecedented', 'Excellent sharpness from the Art lens design', 'Very affordable for cinema glass', 'Smooth, geared cine mechanics'],
    cons: ['Super35 coverage only — won\'t cover full-frame', 'Some sample variation in sharpness', 'Relatively heavy for its focal range', 'Focus breathing is noticeable'],
    verdict: 89,
  },

  // ── LIGHTING ──
  'Aputure LS 600d Pro': {
    description: 'The Aputure 600d Pro is a daylight-balanced LED powerhouse that has become the indie filmmaker\'s HMI replacement. Its 600W COB output punches through diffusion and bounces with authority, while Bowens mount compatibility opens a universe of modifiers.',
    pros: ['Massive output — true HMI replacement territory', 'Bowens mount for endless modifier options', 'Weather-resistant for outdoor shooting', 'Sidus Link app for remote control'],
    cons: ['Daylight only — no bi-color', 'Heavy ballast unit required', 'Fan noise at full power', 'Expensive for a single fixture'],
    verdict: 92,
  },
  'Aputure LS 600x Pro': {
    description: 'The Aputure 600x Pro is the bi-color sibling of the 600d, offering full CCT tunability from 2700K to 6500K. This versatility makes it the go-to key light for productions that need to match mixed practical sources without gels.',
    pros: ['Bi-color 2700K-6500K with high CRI/TLCI', 'Massive output even at tungsten settings', 'Bowens mount modifier ecosystem', 'Sidus Link wireless control'],
    cons: ['Heavy with ballast — not travel-friendly', 'Expensive for LED fixture', 'Fan noise can be an issue for audio', 'Power draw requires dedicated circuits'],
    verdict: 93,
  },
  'Aputure LS 1200d Pro': {
    description: 'The Aputure 1200d Pro is the flagship of Aputure\'s point-source lineup, delivering a staggering 1200W of daylight output that genuinely replaces a 6K HMI. For indie and mid-budget productions, this is the big gun that makes day-for-night and large-space lighting possible.',
    pros: ['Replaces 6K HMI at a fraction of the cost', 'Bowens mount with 18K lux at 3m output', 'Weather-resistant IP54 rating', 'Hyper reflector included'],
    cons: ['Extremely heavy and bulky', 'High power draw — needs generator or dedicated power', 'Very expensive for an LED', 'Fan is loud at full output'],
    verdict: 91,
  },
  'Aputure Nova P600c': {
    description: 'The Aputure Nova P600c is a full-color RGBWW soft panel delivering 600W of supremely color-accurate output across a 2x1 footprint. It excels as a key or fill light where soft, controllable, color-tunable illumination is required.',
    pros: ['Full RGBWW with excellent color accuracy', 'Huge soft output from 2x1 panel', '2000K-10000K CCT range + full HSI/gel library', 'Sidus Link integration'],
    cons: ['Large and heavy — needs a C-stand minimum', 'Very expensive panel', 'Requires yoke for mounting — no Bowens', 'Software can be finicky'],
    verdict: 90,
  },
  'Aputure MT Pro': {
    description: 'The Aputure MT Pro is a compact RGBWW tube light designed for practicals, accents, and creative color effects. Its magnetic mounting system and pixel-addressable LEDs make it an incredibly versatile tool for production design and ambient lighting.',
    pros: ['Full RGBWW in a portable tube form factor', 'Magnetic mounting for quick setup', 'Pixel-addressable for effects and animations', 'Battery powered for total flexibility'],
    cons: ['Low output — accent only, not a key light', 'Short battery life at full brightness', 'App-dependent for advanced features', 'Easy to damage on set'],
    verdict: 84,
  },
  'Aputure Amaran 200d': {
    description: 'The Aputure Amaran 200d is the budget-friendly workhorse of the Aputure ecosystem, packing 200W of daylight LED into a compact COB fixture. It punches remarkably well for its price and is the default recommendation for new filmmakers building a lighting kit.',
    pros: ['Exceptional value for 200W output', 'Bowens mount for modifier compatibility', 'Lightweight and portable', 'Quiet operation'],
    cons: ['Daylight only — no bi-color', 'Lower CRI than LS Pro series', 'Plastic build feels less premium', 'No weather sealing'],
    verdict: 86,
  },
  'ARRI SkyPanel S60-C': {
    description: 'The ARRI SkyPanel S60-C is the industry-standard LED soft panel found on virtually every professional sound stage worldwide. Its unmatched color accuracy and robust construction have made "SkyPanel" synonymous with professional set lighting.',
    pros: ['Industry-standard color accuracy (TLCI 99)', 'Full RGBWW with gel library presets', 'Tank-like build quality for professional abuse', 'DMX, Art-Net, and sACN control'],
    cons: ['Extremely expensive', 'Heavy — needs heavy-duty grip', 'Being superseded by SkyPanel X', 'Power hungry for its output level'],
    verdict: 91,
  },
  'ARRI SkyPanel X': {
    description: 'The ARRI SkyPanel X is the next generation of ARRI\'s legendary soft panel series, combining a completely new LED engine with an integrated processor for on-board effects. It represents the state of the art in professional studio lighting.',
    pros: ['Next-gen ARRI color accuracy', 'Dramatically lighter than S-series', 'Built-in effects engine', 'Connectable panels for custom shapes'],
    cons: ['Premium ARRI pricing', 'New ecosystem — limited accessories initially', 'Requires learning new control interface', 'Heavy investment to replace SkyPanel S fleet'],
    verdict: 94,
  },
  'Litepanels Gemini 2x1 Soft': {
    description: 'The Litepanels Gemini 2x1 Soft is a full-color LED soft panel designed for broadcast and film production. Its high-quality RGBWW array and intuitive controls make it a staple in studios and on location for Vitec Group loyalists.',
    pros: ['Excellent color accuracy for broadcast', 'Intuitive hands-on controls', 'Full RGBWW with CCT and HSI modes', 'Robust aluminum construction'],
    cons: ['Expensive relative to Aputure alternatives', 'Heavy panel requires sturdy grip', 'Limited modifier ecosystem', 'Slower adoption of app-based control'],
    verdict: 85,
  },
  'Nanlite Forza 720B': {
    description: 'The Nanlite Forza 720B is a high-output bi-color COB fixture that competes directly with the Aputure 600x Pro. Its 720W of tunable output and Bowens mount make it a compelling option for productions prioritizing raw power and color flexibility.',
    pros: ['720W bi-color with excellent output', 'Bowens mount for broad modifier compatibility', 'Competitive pricing vs Aputure', 'Quiet operation with external ballast'],
    cons: ['Brand reputation still maturing vs ARRI/Aputure', 'Inconsistent firmware updates', 'Ballast is heavy and cumbersome', 'Limited weatherproofing'],
    verdict: 86,
  },
  'Nanlite Forza 500 II': {
    description: 'The Nanlite Forza 500 II is a 500W daylight COB that offers strong output in a surprisingly compact package. It\'s positioned as a mid-range alternative for productions that need solid punch without the premium pricing of Aputure or ARRI.',
    pros: ['Strong 500W output at competitive price', 'Compact and relatively lightweight', 'Bowens mount modifier compatibility', 'Improved build quality over Mark I'],
    cons: ['Daylight only — no bi-color', 'Fan noise at high output', 'Nanlite ecosystem less mature', 'Limited weather resistance'],
    verdict: 83,
  },
}

// ── Dynamic fallback generator ──

function generateFallback(product) {
  const { name, brand, category, price, specs } = product

  const categoryLabels = {
    cameras: 'cinema camera',
    lenses: 'cinema lens',
    lighting: 'lighting fixture',
  }
  const catLabel = categoryLabels[category] || 'production tool'

  // Build description from available specs
  const specSummary = Object.entries(specs)
    .filter(([, v]) => v.value && v.raw !== 'N/A')
    .map(([k, v]) => `${k}: ${v.raw}`)
    .join(', ')

  const description = `The ${name} by ${brand} is a professional ${catLabel} designed for demanding production environments.${specSummary ? ` Key specifications include ${specSummary}.` : ''}`

  const priceStr = price ? `$${price.toLocaleString()}` : 'quote-based'

  // Generate category-appropriate pros/cons
  const prosByCategory = {
    cameras: [
      `${brand} build quality and reliability`,
      'Professional feature set for production use',
      `Competitive in the ${priceStr} segment`,
    ],
    lenses: [
      `${brand} optical engineering and coating`,
      'Cinema-grade mechanical build',
      'Consistent color rendering',
    ],
    lighting: [
      `${brand} output and color accuracy`,
      'Professional control protocols (DMX)',
      'Built for continuous production use',
    ],
  }

  const consByCategory = {
    cameras: [
      'Research specific use-case fit before committing',
      'Accessory ecosystem costs add up',
    ],
    lenses: [
      'Verify mount and coverage compatibility',
      'Weight should be factored for gimbal/handheld',
    ],
    lighting: [
      'Verify power requirements for your setup',
      'Consider modifier compatibility before purchase',
    ],
  }

  return {
    description,
    pros: prosByCategory[category] || prosByCategory.cameras,
    cons: consByCategory[category] || consByCategory.cameras,
    verdict: price ? Math.min(95, Math.max(70, Math.round(75 + Math.log10(price) * 5))) : 78,
  }
}

export function getExpertAnalysis(product) {
  return KNOWN_PRODUCTS[product.name] || generateFallback(product)
}
