import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Wikidata SPARQL for cars ────────────────────────────────────────────────
// Paginate by year range to bypass LIMIT per query.
// Q3231690 = automobile model, Q2060700 = automobile series (e.g. Corolla, Civic)
// No images — Wikimedia photos are not cutout/transparent.

const YEAR_RANGES = [
  [2020, 2025],
  [2015, 2019],
  [2010, 2014],
  [2005, 2009],
  [1995, 2004],
]

function buildCarSparql(yearMin: number, yearMax: number): string {
  return `
SELECT DISTINCT ?name ?brand ?year ?fuelLabel WHERE {
  { ?item wdt:P31 wd:Q3231690 } UNION { ?item wdt:P31 wd:Q2060700 }
  ?item rdfs:label ?name FILTER(LANG(?name) = "en") .
  ?item wdt:P571 ?d . BIND(YEAR(?d) AS ?year)
  FILTER(?year >= ${yearMin} && ?year <= ${yearMax})
  OPTIONAL { ?item wdt:P176 ?mfr . ?mfr rdfs:label ?brand FILTER(LANG(?brand) = "en") }
  OPTIONAL { ?item wdt:P5765 ?fuel . ?fuel rdfs:label ?fuelLabel FILTER(LANG(?fuelLabel) = "en") }
  FILTER(STRLEN(STR(?name)) > 2)
} LIMIT 400`
}

interface WikiCar {
  name: string
  brand: string
  year: number | null
  fuel: string | null
}

async function sparqlFetch(query: string): Promise<WikiCar[]> {
  try {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Pickvolt/1.0 (https://pickvolt.com; contact@pickvolt.com)' },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return []
    const json = await res.json()
    const bindings: Record<string, { value: string }>[] = json.results?.bindings ?? []
    return bindings.map(b => ({
      name: b.name?.value ?? '',
      brand: b.brand?.value ?? '',
      year: b.year?.value ? parseInt(b.year.value) : null,
      fuel: b.fuelLabel?.value ?? null,
    })).filter(p => p.name.length > 0)
  } catch {
    return []
  }
}

async function fetchCarsFromWikidata(): Promise<WikiCar[]> {
  const all: WikiCar[] = []
  const seen = new Set<string>()

  for (const [yearMin, yearMax] of YEAR_RANGES) {
    const results = await sparqlFetch(buildCarSparql(yearMin, yearMax))
    for (const car of results) {
      const key = `${car.brand}::${car.name}`.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        all.push(car)
      }
    }
    // 짧은 딜레이로 Wikidata rate limit 회피
    await new Promise(r => setTimeout(r, 500))
  }

  return all
}

// Map Wikidata fuel label → our powertrain enum
function mapPowertrain(fuel: string | null): string | null {
  if (!fuel) return null
  const f = fuel.toLowerCase()
  if (f.includes('electric') && !f.includes('hybrid')) return 'BEV'
  if (f.includes('plug-in hybrid') || f.includes('phev')) return 'PHEV'
  if (f.includes('hybrid')) return 'HEV'
  if (f.includes('mild hybrid')) return 'MHEV'
  if (f.includes('gasoline') || f.includes('petrol') || f.includes('diesel')) return 'ICE'
  return null
}

// ─── Pre-seeded catalogs ─────────────────────────────────────────────────────

const SEED_PRODUCTS: Record<string, { name: string; brand: string }[]> = {
  headphones: [
    // Sony
    { brand: 'Sony', name: 'WH-1000XM5' },
    { brand: 'Sony', name: 'WH-1000XM4' },
    { brand: 'Sony', name: 'WF-1000XM5' },
    { brand: 'Sony', name: 'WF-1000XM4' },
    { brand: 'Sony', name: 'WH-CH720N' },
    { brand: 'Sony', name: 'LinkBuds S' },
    { brand: 'Sony', name: 'WH-1000XM3' },
    { brand: 'Sony', name: 'WF-C700N' },
    // Apple
    { brand: 'Apple', name: 'AirPods Pro 2nd Generation' },
    { brand: 'Apple', name: 'AirPods 4' },
    { brand: 'Apple', name: 'AirPods Max' },
    { brand: 'Apple', name: 'AirPods 3rd Generation' },
    // Bose
    { brand: 'Bose', name: 'QuietComfort Ultra Headphones' },
    { brand: 'Bose', name: 'QuietComfort Ultra Earbuds' },
    { brand: 'Bose', name: 'QuietComfort 45' },
    { brand: 'Bose', name: 'QuietComfort Earbuds II' },
    { brand: 'Bose', name: 'SoundLink Flex' },
    // Samsung
    { brand: 'Samsung', name: 'Galaxy Buds3 Pro' },
    { brand: 'Samsung', name: 'Galaxy Buds3' },
    { brand: 'Samsung', name: 'Galaxy Buds2 Pro' },
    { brand: 'Samsung', name: 'Galaxy Buds2' },
    { brand: 'Samsung', name: 'Galaxy Buds FE' },
    { brand: 'Samsung', name: 'Galaxy Buds Live' },
    // Sennheiser
    { brand: 'Sennheiser', name: 'Momentum 4 Wireless' },
    { brand: 'Sennheiser', name: 'Momentum True Wireless 4' },
    { brand: 'Sennheiser', name: 'Momentum True Wireless 3' },
    { brand: 'Sennheiser', name: 'IE 600' },
    { brand: 'Sennheiser', name: 'HD 660S2' },
    { brand: 'Sennheiser', name: 'HD 560S' },
    // JBL
    { brand: 'JBL', name: 'Tour One M2' },
    { brand: 'JBL', name: 'Live Pro 2 TWS' },
    { brand: 'JBL', name: 'Tune 770NC' },
    { brand: 'JBL', name: 'Reflect Aero TWS' },
    { brand: 'JBL', name: 'Endurance Peak 3' },
    // Jabra
    { brand: 'Jabra', name: 'Elite 10' },
    { brand: 'Jabra', name: 'Elite 8 Active' },
    { brand: 'Jabra', name: 'Elite 4' },
    { brand: 'Jabra', name: 'Evolve2 85' },
    { brand: 'Jabra', name: 'Evolve2 65' },
    // Audio-Technica
    { brand: 'Audio-Technica', name: 'ATH-M50xBT2' },
    { brand: 'Audio-Technica', name: 'ATH-M50x' },
    { brand: 'Audio-Technica', name: 'ATH-TWX9' },
    { brand: 'Audio-Technica', name: 'ATH-CKS50TW2' },
    // Bang & Olufsen
    { brand: 'Bang & Olufsen', name: 'Beoplay H95' },
    { brand: 'Bang & Olufsen', name: 'Beoplay EX' },
    { brand: 'Bang & Olufsen', name: 'Beoplay HX' },
    // AKG
    { brand: 'AKG', name: 'N700NC M2' },
    { brand: 'AKG', name: 'K371-BT' },
    // Anker / Soundcore
    { brand: 'Soundcore', name: 'Liberty 4 NC' },
    { brand: 'Soundcore', name: 'Space One' },
    { brand: 'Soundcore', name: 'Q45' },
    // Nothing
    { brand: 'Nothing', name: 'Ear (2)' },
    { brand: 'Nothing', name: 'Ear (a)' },
    { brand: 'Nothing', name: 'Ear' },
    // Google
    { brand: 'Google', name: 'Pixel Buds Pro 2' },
    { brand: 'Google', name: 'Pixel Buds Pro' },
    { brand: 'Google', name: 'Pixel Buds A-Series' },
    // Beats
    { brand: 'Beats', name: 'Studio Pro' },
    { brand: 'Beats', name: 'Fit Pro' },
    { brand: 'Beats', name: 'Studio Buds+' },
    // Marshall
    { brand: 'Marshall', name: 'Monitor III ANC' },
    { brand: 'Marshall', name: 'Motif II ANC' },
    // Shure
    { brand: 'Shure', name: 'AONIC 50 Gen 2' },
    { brand: 'Shure', name: 'SE846' },
  ],

  monitor: [
    // LG
    { brand: 'LG', name: 'UltraGear 27GP950-B' },
    { brand: 'LG', name: 'UltraGear 27GP850-B' },
    { brand: 'LG', name: 'UltraGear 32GR95UE' },
    { brand: 'LG', name: 'UltraGear 27GR95QE' },
    { brand: 'LG', name: 'UltraFine 27UP850N' },
    { brand: 'LG', name: 'UltraWide 34WQ75C' },
    { brand: 'LG', name: 'UltraGear 27GQ950-B' },
    { brand: 'LG', name: 'UltraGear 48GQ900-B' },
    { brand: 'LG', name: 'UltraGear 45GR95QE' },
    // Samsung
    { brand: 'Samsung', name: 'Odyssey G7 27"' },
    { brand: 'Samsung', name: 'Odyssey G8 OLED 34"' },
    { brand: 'Samsung', name: 'Odyssey Neo G9 57"' },
    { brand: 'Samsung', name: 'Odyssey OLED G9 49"' },
    { brand: 'Samsung', name: 'ViewFinity S9 27"' },
    { brand: 'Samsung', name: 'Smart Monitor M8 32"' },
    { brand: 'Samsung', name: 'Odyssey G4 27"' },
    { brand: 'Samsung', name: 'Odyssey Neo G7 32"' },
    // ASUS
    { brand: 'ASUS', name: 'ROG Swift PG27AQN' },
    { brand: 'ASUS', name: 'ROG Swift OLED PG27AQDP' },
    { brand: 'ASUS', name: 'ROG Swift PG32UCDM' },
    { brand: 'ASUS', name: 'ProArt PA32UCX-PK' },
    { brand: 'ASUS', name: 'ProArt PA279CRV' },
    { brand: 'ASUS', name: 'TUF Gaming VG279QM' },
    { brand: 'ASUS', name: 'TUF Gaming VG32UQA' },
    // Dell
    { brand: 'Dell', name: 'UltraSharp U2723QE' },
    { brand: 'Dell', name: 'UltraSharp U3223QE' },
    { brand: 'Dell', name: 'Alienware AW3423DWF' },
    { brand: 'Dell', name: 'Alienware AW2725DF' },
    { brand: 'Dell', name: 'S2722QC' },
    { brand: 'Dell', name: 'G3223D' },
    // BenQ
    { brand: 'BenQ', name: 'PD2725U' },
    { brand: 'BenQ', name: 'MOBIUZ EX3210U' },
    { brand: 'BenQ', name: 'EW3280U' },
    { brand: 'BenQ', name: 'PD3220U' },
    // Apple
    { brand: 'Apple', name: 'Pro Display XDR' },
    { brand: 'Apple', name: 'Studio Display' },
    // AOC
    { brand: 'AOC', name: 'AGON Pro AG274QZM' },
    { brand: 'AOC', name: 'U27P2CA' },
    { brand: 'AOC', name: 'AG274FZ' },
    // ViewSonic
    { brand: 'ViewSonic', name: 'Elite XG270QG' },
    { brand: 'ViewSonic', name: 'ColorPro VP3268a-4K' },
    // Gigabyte
    { brand: 'Gigabyte', name: 'M27Q X' },
    { brand: 'Gigabyte', name: 'FO32U2P' },
    { brand: 'Gigabyte', name: 'M28U' },
    // MSI
    { brand: 'MSI', name: 'MEG 342C QD-OLED' },
    { brand: 'MSI', name: 'MPG 321URX QD-OLED' },
    { brand: 'MSI', name: 'Optix MAG274QRF-QD' },
    // Acer
    { brand: 'Acer', name: 'Predator XB283K' },
    { brand: 'Acer', name: 'Nitro XV282K KV' },
    // HP
    { brand: 'HP', name: 'OMEN 27q' },
    { brand: 'HP', name: 'Z27k G3' },
  ],

  tv: [
    // LG
    { brand: 'LG', name: 'OLED C4 65"' },
    { brand: 'LG', name: 'OLED C4 77"' },
    { brand: 'LG', name: 'OLED C3 65"' },
    { brand: 'LG', name: 'OLED G4 65"' },
    { brand: 'LG', name: 'OLED G3 65"' },
    { brand: 'LG', name: 'QNED90 75"' },
    { brand: 'LG', name: 'OLED B4 65"' },
    { brand: 'LG', name: 'OLED evo C4 55"' },
    // Samsung
    { brand: 'Samsung', name: 'S95D 65" QD-OLED' },
    { brand: 'Samsung', name: 'S95C 65" QD-OLED' },
    { brand: 'Samsung', name: 'QN90D 65" Neo QLED' },
    { brand: 'Samsung', name: 'QN90C 65" Neo QLED' },
    { brand: 'Samsung', name: 'QN900C 85" Neo QLED 8K' },
    { brand: 'Samsung', name: 'The Frame 55"' },
    { brand: 'Samsung', name: 'QN85D 55" Neo QLED' },
    { brand: 'Samsung', name: 'DU8000 75"' },
    // Sony
    { brand: 'Sony', name: 'Bravia XR A95L 65"' },
    { brand: 'Sony', name: 'Bravia XR A80L 55"' },
    { brand: 'Sony', name: 'Bravia XR X95L 85"' },
    { brand: 'Sony', name: 'Bravia 7 75"' },
    { brand: 'Sony', name: 'Bravia 8 65"' },
    { brand: 'Sony', name: 'Bravia XR A90J 65"' },
    // Hisense
    { brand: 'Hisense', name: 'U8K 65"' },
    { brand: 'Hisense', name: 'U9K 85"' },
    { brand: 'Hisense', name: 'U6K 55"' },
    { brand: 'Hisense', name: 'U7K 65"' },
    { brand: 'Hisense', name: '110UX 110"' },
    // TCL
    { brand: 'TCL', name: 'QM8 65"' },
    { brand: 'TCL', name: 'Q7 55"' },
    { brand: 'TCL', name: 'S4 50"' },
    // Panasonic
    { brand: 'Panasonic', name: 'MZ2000 65" OLED' },
    { brand: 'Panasonic', name: 'MX950 65"' },
    { brand: 'Panasonic', name: 'Z95A 65" OLED' },
    // Philips
    { brand: 'Philips', name: 'OLED+908 65"' },
    { brand: 'Philips', name: 'PML9308 75"' },
    // Sharp
    { brand: 'Sharp', name: 'AQUOS XLED 65"' },
  ],

  car: [
    // Tesla
    { brand: 'Tesla', name: 'Model 3 (2024)' },
    { brand: 'Tesla', name: 'Model Y Long Range AWD' },
    { brand: 'Tesla', name: 'Model Y Performance' },
    { brand: 'Tesla', name: 'Model S Plaid' },
    { brand: 'Tesla', name: 'Model X Plaid' },
    { brand: 'Tesla', name: 'Cybertruck AWD' },
    { brand: 'Tesla', name: 'Model 3 Performance' },
    // BMW
    { brand: 'BMW', name: 'i4 eDrive40' },
    { brand: 'BMW', name: 'i4 M50' },
    { brand: 'BMW', name: 'iX xDrive50' },
    { brand: 'BMW', name: 'iX M60' },
    { brand: 'BMW', name: 'i7 xDrive60' },
    { brand: 'BMW', name: 'i5 eDrive40' },
    { brand: 'BMW', name: 'i3 eDrive35L' },
    { brand: 'BMW', name: '3 Series 330i' },
    { brand: 'BMW', name: '5 Series 530i' },
    { brand: 'BMW', name: 'X5 xDrive45e' },
    // Mercedes-Benz
    { brand: 'Mercedes-Benz', name: 'EQS 450+' },
    { brand: 'Mercedes-Benz', name: 'EQS 580 4MATIC' },
    { brand: 'Mercedes-Benz', name: 'EQE 350+' },
    { brand: 'Mercedes-Benz', name: 'EQA 250+' },
    { brand: 'Mercedes-Benz', name: 'EQB 350 4MATIC' },
    { brand: 'Mercedes-Benz', name: 'C-Class C 300' },
    { brand: 'Mercedes-Benz', name: 'E-Class E 350' },
    { brand: 'Mercedes-Benz', name: 'GLE 450 4MATIC' },
    // Audi
    { brand: 'Audi', name: 'Q8 e-tron' },
    { brand: 'Audi', name: 'Q8 e-tron Sportback' },
    { brand: 'Audi', name: 'e-tron GT quattro' },
    { brand: 'Audi', name: 'RS e-tron GT' },
    { brand: 'Audi', name: 'Q4 e-tron' },
    { brand: 'Audi', name: 'A6 e-tron' },
    { brand: 'Audi', name: 'A4 45 TFSI' },
    // Hyundai
    { brand: 'Hyundai', name: 'IONIQ 6 SE Long Range RWD' },
    { brand: 'Hyundai', name: 'IONIQ 6 SE Long Range AWD' },
    { brand: 'Hyundai', name: 'IONIQ 5 AWD Long Range' },
    { brand: 'Hyundai', name: 'IONIQ 5 N' },
    { brand: 'Hyundai', name: 'Kona Electric 2024' },
    { brand: 'Hyundai', name: 'IONIQ 9' },
    { brand: 'Hyundai', name: 'Tucson PHEV' },
    // Kia
    { brand: 'Kia', name: 'EV6 GT' },
    { brand: 'Kia', name: 'EV6 GT-Line AWD' },
    { brand: 'Kia', name: 'EV9 GT-Line' },
    { brand: 'Kia', name: 'EV9 Land' },
    { brand: 'Kia', name: 'EV3 Long Range' },
    { brand: 'Kia', name: 'Sportage PHEV' },
    // Ford
    { brand: 'Ford', name: 'F-150 Lightning Pro' },
    { brand: 'Ford', name: 'F-150 Lightning Lariat' },
    { brand: 'Ford', name: 'Mustang Mach-E Premium AWD' },
    { brand: 'Ford', name: 'Explorer EV' },
    // Volkswagen
    { brand: 'Volkswagen', name: 'ID.4 Pro S' },
    { brand: 'Volkswagen', name: 'ID.4 GTX' },
    { brand: 'Volkswagen', name: 'ID.7 Pro' },
    { brand: 'Volkswagen', name: 'ID.3 Pro S' },
    { brand: 'Volkswagen', name: 'Golf GTI' },
    // Toyota
    { brand: 'Toyota', name: 'bZ4X XLE AWD' },
    { brand: 'Toyota', name: 'RAV4 Prime XSE' },
    { brand: 'Toyota', name: 'Prius Prime XSE' },
    { brand: 'Toyota', name: 'Crown Platinum PHEV' },
    { brand: 'Toyota', name: 'Camry Hybrid XSE' },
    // Porsche
    { brand: 'Porsche', name: 'Taycan GTS' },
    { brand: 'Porsche', name: 'Taycan Turbo S' },
    { brand: 'Porsche', name: 'Macan 4 Electric' },
    { brand: 'Porsche', name: 'Cayenne E-Hybrid' },
    { brand: 'Porsche', name: 'Panamera 4S E-Hybrid' },
    // Volvo
    { brand: 'Volvo', name: 'EX90 Twin Motor Performance' },
    { brand: 'Volvo', name: 'EX40 Single Motor Extended Range' },
    { brand: 'Volvo', name: 'C40 Recharge Twin' },
    { brand: 'Volvo', name: 'XC60 Recharge PHEV' },
    // BYD
    { brand: 'BYD', name: 'Atto 3' },
    { brand: 'BYD', name: 'Han EV' },
    { brand: 'BYD', name: 'Dolphin' },
    { brand: 'BYD', name: 'Seal' },
    { brand: 'BYD', name: 'Seal U' },
    { brand: 'BYD', name: 'Tang EV' },
    // Rivian
    { brand: 'Rivian', name: 'R1T Dual-Motor' },
    { brand: 'Rivian', name: 'R1T Quad-Motor' },
    { brand: 'Rivian', name: 'R1S Quad-Motor' },
    { brand: 'Rivian', name: 'R2' },
    // Lucid
    { brand: 'Lucid', name: 'Air Grand Touring' },
    { brand: 'Lucid', name: 'Air Pure' },
    { brand: 'Lucid', name: 'Air Sapphire' },
    // Chevrolet
    { brand: 'Chevrolet', name: 'Equinox EV LT' },
    { brand: 'Chevrolet', name: 'Blazer EV SS' },
    { brand: 'Chevrolet', name: 'Silverado EV Work Truck' },
    // Honda
    { brand: 'Honda', name: 'Prologue AWD' },
    { brand: 'Honda', name: 'CR-V e:PHEV' },
    { brand: 'Honda', name: 'Civic e:HEV' },
    // Nissan
    { brand: 'Nissan', name: 'Ariya Evolve+' },
    { brand: 'Nissan', name: 'Leaf e+' },
    // Stellantis / Jeep
    { brand: 'Jeep', name: 'Wrangler 4xe' },
    { brand: 'Jeep', name: 'Grand Cherokee 4xe' },
    // Polestar
    { brand: 'Polestar', name: 'Polestar 2 Long Range Dual Motor' },
    { brand: 'Polestar', name: 'Polestar 3' },
    { brand: 'Polestar', name: 'Polestar 4' },
    // Xpeng
    { brand: 'Xpeng', name: 'P7' },
    { brand: 'Xpeng', name: 'G9' },
    { brand: 'Xpeng', name: 'G6' },
    // NIO
    { brand: 'NIO', name: 'ET7' },
    { brand: 'NIO', name: 'EL8' },
    { brand: 'NIO', name: 'ET5' },
    // Zeekr
    { brand: 'Zeekr', name: '001' },
    { brand: 'Zeekr', name: '009' },
  ],
}

// ─── Main collector ──────────────────────────────────────────────────────────

export async function collectWikidataProducts(
  categories: string[] = ['headphones', 'monitor', 'tv', 'car']
): Promise<{ category: string; inserted: number; skipped: number; source: string; error?: string }[]> {
  const supabase = makeService()
  const results = []

  for (const category of categories) {
    let candidates: { name: string; brand: string; launch_year?: number | null; powertrain?: string | null }[] = [
      ...(SEED_PRODUCTS[category] ?? []),
    ]

    // Cars: enrich with Wikidata (images + year + fuel type + more models)
    if (category === 'car') {
      const wikiCars = await fetchCarsFromWikidata()
      const seedNames = new Set(candidates.map(c => c.name.toLowerCase()))
      for (const w of wikiCars) {
        if (!w.name) continue
        if (seedNames.has(w.name.toLowerCase())) {
          // Enrich existing seed entry with Wikidata image/year if available
          const idx = candidates.findIndex(c => c.name.toLowerCase() === w.name.toLowerCase())
          if (idx >= 0) {
            if (!candidates[idx].launch_year && w.year) candidates[idx].launch_year = w.year
            if (!candidates[idx].powertrain && w.fuel) candidates[idx].powertrain = mapPowertrain(w.fuel)
          }
        } else {
          candidates.push({
            name: w.name,
            brand: w.brand,
            launch_year: w.year,
            powertrain: mapPowertrain(w.fuel),
          })
          seedNames.add(w.name.toLowerCase())
        }
      }
    }

    if (candidates.length === 0) {
      results.push({ category, inserted: 0, skipped: 0, source: 'none' })
      continue
    }

    // Get existing products in this category
    const { data: existing, error: fetchErr } = await supabase
      .from('products')
      .select('name, brand')
      .eq('category', category)

    if (fetchErr) {
      results.push({ category, inserted: 0, skipped: 0, source: 'seed', error: fetchErr.message })
      continue
    }

    const existingKeys = new Set(
      (existing ?? []).map((p: { name: string; brand: string }) =>
        `${p.brand ?? ''}::${p.name}`.toLowerCase()
      )
    )

    const toInsert = candidates.filter(
      p => !existingKeys.has(`${p.brand ?? ''}::${p.name}`.toLowerCase())
    )

    const skipped = candidates.length - toInsert.length

    if (toInsert.length === 0) {
      results.push({ category, inserted: 0, skipped, source: 'seed' })
      continue
    }

    let inserted = 0
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50)
      const rows = batch.map(p => ({
        name: p.name,
        brand: p.brand || null,
        category,
        is_visible: false,
        scrape_status: 'pending',
      }))
      const { data: inserted_rows, error: insertErr } = await supabase
        .from('products')
        .insert(rows)
        .select('id, name')

      if (!insertErr && inserted_rows) {
        inserted += inserted_rows.length

        // For cars: also insert specs_car with powertrain if available
        if (category === 'car') {
          const specsBatch = inserted_rows
            .map((row: { id: string; name: string }) => {
              const src = batch.find(p => p.name === row.name)
              const powertrain = src?.powertrain ?? null
              const launch_year = src?.launch_year ?? null
              if (!powertrain && !launch_year) return null
              return { product_id: row.id, powertrain, launch_year }
            })
            .filter(Boolean)

          if (specsBatch.length > 0) {
            // Insert launch_year into specs_common
            const commonBatch = specsBatch
              .filter((s: { launch_year: number | null } | null) => s?.launch_year)
              .map((s: { product_id: string; launch_year: number | null } | null) => ({
                product_id: s!.product_id,
                launch_year: s!.launch_year,
              }))
            if (commonBatch.length > 0) {
              await supabase.from('specs_common').upsert(commonBatch, { onConflict: 'product_id' })
            }

            // Insert powertrain into specs_car
            const carBatch = specsBatch
              .filter((s: { powertrain: string | null } | null) => s?.powertrain)
              .map((s: { product_id: string; powertrain: string | null } | null) => ({
                product_id: s!.product_id,
                powertrain: s!.powertrain,
              }))
            if (carBatch.length > 0) {
              await supabase.from('specs_car').upsert(carBatch, { onConflict: 'product_id' })
            }
          }
        }
      }
    }

    results.push({
      category,
      inserted,
      skipped,
      source: category === 'car' ? 'seed+wikidata' : 'seed',
    })
  }

  return results
}
