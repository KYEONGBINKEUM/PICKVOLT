import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Pre-seeded popular products ────────────────────────────────────────────
// Wikidata has almost no individual consumer electronics product pages.
// We maintain a curated list of well-known products instead.
// Cars use Wikidata SPARQL since automobile models are well-cataloged there.

const SEED_PRODUCTS: Record<string, { name: string; brand: string }[]> = {
  headphones: [
    // Sony
    { brand: 'Sony', name: 'WH-1000XM5' },
    { brand: 'Sony', name: 'WH-1000XM4' },
    { brand: 'Sony', name: 'WF-1000XM5' },
    { brand: 'Sony', name: 'WF-1000XM4' },
    { brand: 'Sony', name: 'WH-CH720N' },
    { brand: 'Sony', name: 'LinkBuds S' },
    // Apple
    { brand: 'Apple', name: 'AirPods Pro 2nd Generation' },
    { brand: 'Apple', name: 'AirPods 4' },
    { brand: 'Apple', name: 'AirPods Max' },
    // Bose
    { brand: 'Bose', name: 'QuietComfort Ultra Headphones' },
    { brand: 'Bose', name: 'QuietComfort Ultra Earbuds' },
    { brand: 'Bose', name: 'QuietComfort 45' },
    { brand: 'Bose', name: 'QuietComfort Earbuds II' },
    // Samsung
    { brand: 'Samsung', name: 'Galaxy Buds3 Pro' },
    { brand: 'Samsung', name: 'Galaxy Buds3' },
    { brand: 'Samsung', name: 'Galaxy Buds2 Pro' },
    { brand: 'Samsung', name: 'Galaxy Buds FE' },
    // Sennheiser
    { brand: 'Sennheiser', name: 'Momentum 4 Wireless' },
    { brand: 'Sennheiser', name: 'Momentum True Wireless 4' },
    { brand: 'Sennheiser', name: 'IE 600' },
    { brand: 'Sennheiser', name: 'HD 660S2' },
    // JBL
    { brand: 'JBL', name: 'Tour One M2' },
    { brand: 'JBL', name: 'Live Pro 2 TWS' },
    { brand: 'JBL', name: 'Tune 770NC' },
    // Jabra
    { brand: 'Jabra', name: 'Elite 10' },
    { brand: 'Jabra', name: 'Elite 8 Active' },
    { brand: 'Jabra', name: 'Evolve2 85' },
    // Audio-Technica
    { brand: 'Audio-Technica', name: 'ATH-M50xBT2' },
    { brand: 'Audio-Technica', name: 'ATH-M50x' },
    { brand: 'Audio-Technica', name: 'ATH-TWX9' },
    // Bang & Olufsen
    { brand: 'Bang & Olufsen', name: 'Beoplay H95' },
    { brand: 'Bang & Olufsen', name: 'Beoplay EX' },
    // AKG
    { brand: 'AKG', name: 'N700NC M2' },
    { brand: 'AKG', name: 'K371-BT' },
  ],

  monitor: [
    // LG
    { brand: 'LG', name: 'UltraGear 27GP950-B' },
    { brand: 'LG', name: 'UltraGear 27GP850-B' },
    { brand: 'LG', name: 'UltraGear 32GR95UE' },
    { brand: 'LG', name: 'UltraGear 27GR95QE' },
    { brand: 'LG', name: 'UltraFine 27UP850N' },
    { brand: 'LG', name: 'UltraWide 34WQ75C' },
    // Samsung
    { brand: 'Samsung', name: 'Odyssey G7 27"' },
    { brand: 'Samsung', name: 'Odyssey G8 OLED 34"' },
    { brand: 'Samsung', name: 'Odyssey Neo G9 57"' },
    { brand: 'Samsung', name: 'ViewFinity S9 27"' },
    { brand: 'Samsung', name: 'Smart Monitor M8 32"' },
    // ASUS
    { brand: 'ASUS', name: 'ROG Swift PG27AQN' },
    { brand: 'ASUS', name: 'ROG Swift OLED PG27AQDP' },
    { brand: 'ASUS', name: 'ProArt PA32UCX-PK' },
    { brand: 'ASUS', name: 'TUF Gaming VG279QM' },
    // Dell
    { brand: 'Dell', name: 'UltraSharp U2723QE' },
    { brand: 'Dell', name: 'UltraSharp U3223QE' },
    { brand: 'Dell', name: 'Alienware AW3423DWF' },
    { brand: 'Dell', name: 'S2722QC' },
    // BenQ
    { brand: 'BenQ', name: 'PD2725U' },
    { brand: 'BenQ', name: 'MOBIUZ EX3210U' },
    { brand: 'BenQ', name: 'EW3280U' },
    // Apple
    { brand: 'Apple', name: 'Pro Display XDR' },
    { brand: 'Apple', name: 'Studio Display' },
    // AOC
    { brand: 'AOC', name: 'AGON Pro AG274QZM' },
    { brand: 'AOC', name: 'U27P2CA' },
    // ViewSonic
    { brand: 'ViewSonic', name: 'Elite XG270QG' },
    { brand: 'ViewSonic', name: 'ColorPro VP3268a-4K' },
  ],

  tv: [
    // LG
    { brand: 'LG', name: 'OLED C4 65"' },
    { brand: 'LG', name: 'OLED C3 65"' },
    { brand: 'LG', name: 'OLED G4 65"' },
    { brand: 'LG', name: 'OLED G3 65"' },
    { brand: 'LG', name: 'QNED90 75"' },
    { brand: 'LG', name: 'OLED evo C4 77"' },
    // Samsung
    { brand: 'Samsung', name: 'S95D 65" QD-OLED' },
    { brand: 'Samsung', name: 'S95C 65" QD-OLED' },
    { brand: 'Samsung', name: 'QN90D 65" Neo QLED' },
    { brand: 'Samsung', name: 'QN90C 65" Neo QLED' },
    { brand: 'Samsung', name: 'QN900C 85" Neo QLED 8K' },
    { brand: 'Samsung', name: 'The Frame 55"' },
    // Sony
    { brand: 'Sony', name: 'Bravia XR A95L 65"' },
    { brand: 'Sony', name: 'Bravia XR A80L 55"' },
    { brand: 'Sony', name: 'Bravia XR X95L 85"' },
    { brand: 'Sony', name: 'Bravia 7 75"' },
    { brand: 'Sony', name: 'Bravia 8 65"' },
    // Hisense
    { brand: 'Hisense', name: 'U8K 65"' },
    { brand: 'Hisense', name: 'U9K 85"' },
    { brand: 'Hisense', name: 'U6K 55"' },
    // TCL
    { brand: 'TCL', name: 'QM8 65"' },
    { brand: 'TCL', name: 'S Class 55"' },
    // Panasonic
    { brand: 'Panasonic', name: 'MZ2000 65" OLED' },
    { brand: 'Panasonic', name: 'MX950 65"' },
  ],

  car: [
    // Tesla
    { brand: 'Tesla', name: 'Model 3 (2024)' },
    { brand: 'Tesla', name: 'Model Y' },
    { brand: 'Tesla', name: 'Model S Plaid' },
    { brand: 'Tesla', name: 'Model X Plaid' },
    { brand: 'Tesla', name: 'Cybertruck' },
    // BMW
    { brand: 'BMW', name: 'i4 eDrive40' },
    { brand: 'BMW', name: 'iX xDrive50' },
    { brand: 'BMW', name: 'i7 xDrive60' },
    { brand: 'BMW', name: 'i5 eDrive40' },
    { brand: 'BMW', name: '3 Series 330i' },
    // Mercedes-Benz
    { brand: 'Mercedes-Benz', name: 'EQS 450+' },
    { brand: 'Mercedes-Benz', name: 'EQE 350+' },
    { brand: 'Mercedes-Benz', name: 'EQA 250+' },
    { brand: 'Mercedes-Benz', name: 'C-Class C 300' },
    { brand: 'Mercedes-Benz', name: 'E-Class E 350' },
    // Audi
    { brand: 'Audi', name: 'Q8 e-tron' },
    { brand: 'Audi', name: 'e-tron GT quattro' },
    { brand: 'Audi', name: 'Q4 e-tron' },
    { brand: 'Audi', name: 'A6 e-tron' },
    // Hyundai
    { brand: 'Hyundai', name: 'IONIQ 6 SE Standard Range' },
    { brand: 'Hyundai', name: 'IONIQ 6 Long Range AWD' },
    { brand: 'Hyundai', name: 'IONIQ 5 AWD' },
    { brand: 'Hyundai', name: 'Kona Electric' },
    { brand: 'Hyundai', name: 'IONIQ 9' },
    // Kia
    { brand: 'Kia', name: 'EV6 GT' },
    { brand: 'Kia', name: 'EV6 GT-Line AWD' },
    { brand: 'Kia', name: 'EV9 GT-Line' },
    { brand: 'Kia', name: 'EV3' },
    // Ford
    { brand: 'Ford', name: 'F-150 Lightning Pro' },
    { brand: 'Ford', name: 'Mustang Mach-E Premium' },
    // Volkswagen
    { brand: 'Volkswagen', name: 'ID.4 Pro' },
    { brand: 'Volkswagen', name: 'ID.7 Pro' },
    { brand: 'Volkswagen', name: 'ID.3 Pro S' },
    // Toyota
    { brand: 'Toyota', name: 'bZ4X XLE AWD' },
    { brand: 'Toyota', name: 'RAV4 Prime XSE' },
    { brand: 'Toyota', name: 'Prius Prime XSE' },
    // Porsche
    { brand: 'Porsche', name: 'Taycan GTS' },
    { brand: 'Porsche', name: 'Macan 4 Electric' },
    { brand: 'Porsche', name: 'Cayenne E-Hybrid' },
    // Volvo
    { brand: 'Volvo', name: 'EX90 Twin Motor' },
    { brand: 'Volvo', name: 'EX40 Single Motor' },
    { brand: 'Volvo', name: 'C40 Recharge' },
    // BYD
    { brand: 'BYD', name: 'Atto 3' },
    { brand: 'BYD', name: 'Han EV' },
    { brand: 'BYD', name: 'Dolphin' },
    { brand: 'BYD', name: 'Seal' },
    { brand: 'BYD', name: 'Seal U' },
    // Rivian
    { brand: 'Rivian', name: 'R1T Dual-Motor' },
    { brand: 'Rivian', name: 'R1S Quad-Motor' },
    // Lucid
    { brand: 'Lucid', name: 'Air Grand Touring' },
    { brand: 'Lucid', name: 'Air Pure' },
  ],
}

// ─── Wikidata SPARQL (cars only — well-cataloged) ────────────────────────────
// Note: P279* subclass traversal causes timeouts on Wikidata.
// Use simple P31 direct match only, with optional manufacturer.
const CAR_SPARQL = `
SELECT DISTINCT ?name ?brand WHERE {
  ?item wdt:P31 wd:Q3231690 .
  ?item rdfs:label ?name FILTER(LANG(?name) = "en") .
  OPTIONAL { ?item wdt:P176 ?mfr . ?mfr rdfs:label ?brand FILTER(LANG(?brand) = "en") }
  FILTER(BOUND(?name) && STRLEN(STR(?name)) > 2)
} LIMIT 300`

async function fetchCarsFromWikidata(): Promise<{ name: string; brand: string }[]> {
  try {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(CAR_SPARQL)}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Pickvolt/1.0 (https://pickvolt.com; contact@pickvolt.com)' },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return []
    const json = await res.json()
    const bindings: Record<string, { value: string }>[] = json.results?.bindings ?? []
    const seen = new Set<string>()
    return bindings
      .map(b => ({ name: b.name?.value ?? '', brand: b.brand?.value ?? '' }))
      .filter(p => {
        if (!p.name) return false
        const key = `${p.brand}::${p.name}`.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  } catch {
    return []
  }
}

// ─── Main collector ──────────────────────────────────────────────────────────

export async function collectWikidataProducts(
  categories: string[] = ['headphones', 'monitor', 'tv', 'car']
): Promise<{ category: string; inserted: number; skipped: number; source: string }[]> {
  const supabase = makeService()
  const results = []

  for (const category of categories) {
    // Build candidate list: pre-seeded + Wikidata for cars
    let candidates: { name: string; brand: string }[] = [
      ...(SEED_PRODUCTS[category] ?? []),
    ]

    if (category === 'car') {
      const wikiCars = await fetchCarsFromWikidata()
      // Merge Wikidata cars (dedup by name)
      const seedNames = new Set(candidates.map(c => c.name.toLowerCase()))
      for (const w of wikiCars) {
        if (w.name && !seedNames.has(w.name.toLowerCase())) {
          candidates.push(w)
          seedNames.add(w.name.toLowerCase())
        }
      }
    }

    if (candidates.length === 0) {
      results.push({ category, inserted: 0, skipped: 0, source: 'none' })
      continue
    }

    // Get existing products in this category
    const { data: existing } = await supabase
      .from('products')
      .select('name, brand')
      .eq('category', category)

    const existingKeys = new Set(
      (existing ?? []).map((p: { name: string; brand: string }) =>
        `${(p.brand ?? '')}::${p.name}`.toLowerCase()
      )
    )

    const toInsert = candidates
      .filter(p => !existingKeys.has(`${p.brand}::${p.name}`.toLowerCase()))
      .map(p => ({
        name: p.name,
        brand: p.brand || null,
        category,
        is_visible: false,
        scrape_status: 'pending',
      }))

    const skipped = candidates.length - toInsert.length

    if (toInsert.length === 0) {
      results.push({ category, inserted: 0, skipped, source: 'seed' })
      continue
    }

    let inserted = 0
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50)
      const { error } = await supabase.from('products').insert(batch)
      if (!error) inserted += batch.length
    }

    results.push({ category, inserted, skipped, source: category === 'car' ? 'seed+wikidata' : 'seed' })
  }

  return results
}
