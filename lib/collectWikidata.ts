import { createClient } from '@supabase/supabase-js'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

interface WikiProduct {
  name: string
  brand: string
  year: number | null
}

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sparqlQuery(sparql: string): Promise<WikiProduct[]> {
  try {
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Pickvolt/1.0 (https://pickvolt.com; product@pickvolt.com)' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return []
    const json = await res.json()
    const bindings = json.results?.bindings ?? []
    const seen = new Set<string>()
    return bindings
      .map((b: Record<string, { value: string }>) => ({
        name: b.name?.value ?? '',
        brand: b.brand?.value ?? '',
        year: b.year?.value ? parseInt(b.year.value) : null,
      }))
      .filter((p: WikiProduct) => {
        if (!p.name || !p.brand) return false
        const key = `${p.brand}::${p.name}`.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  } catch {
    return []
  }
}

const QUERIES: Record<string, string> = {
  headphones: `
    SELECT DISTINCT ?name ?brand ?year WHERE {
      ?item wdt:P31/wdt:P279* wd:Q13235160 .
      ?item rdfs:label ?name FILTER(LANG(?name) = "en") .
      ?item wdt:P176 ?mfr . ?mfr rdfs:label ?brand FILTER(LANG(?brand) = "en") .
      OPTIONAL { ?item wdt:P571 ?d . BIND(YEAR(?d) AS ?year) }
      FILTER(!BOUND(?year) || ?year >= 2018)
    } LIMIT 150`,
  monitor: `
    SELECT DISTINCT ?name ?brand ?year WHERE {
      ?item wdt:P31/wdt:P279* wd:Q160825 .
      ?item rdfs:label ?name FILTER(LANG(?name) = "en") .
      ?item wdt:P176 ?mfr . ?mfr rdfs:label ?brand FILTER(LANG(?brand) = "en") .
      OPTIONAL { ?item wdt:P571 ?d . BIND(YEAR(?d) AS ?year) }
      FILTER(!BOUND(?year) || ?year >= 2018)
    } LIMIT 100`,
  tv: `
    SELECT DISTINCT ?name ?brand ?year WHERE {
      ?item wdt:P31/wdt:P279* wd:Q2697773 .
      ?item rdfs:label ?name FILTER(LANG(?name) = "en") .
      ?item wdt:P176 ?mfr . ?mfr rdfs:label ?brand FILTER(LANG(?brand) = "en") .
      OPTIONAL { ?item wdt:P571 ?d . BIND(YEAR(?d) AS ?year) }
      FILTER(!BOUND(?year) || ?year >= 2019)
    } LIMIT 150`,
  car: `
    SELECT DISTINCT ?name ?brand ?year WHERE {
      ?item wdt:P31 wd:Q3231690 .
      ?item rdfs:label ?name FILTER(LANG(?name) = "en") .
      ?item wdt:P176 ?mfr . ?mfr rdfs:label ?brand FILTER(LANG(?brand) = "en") .
      OPTIONAL { ?item wdt:P571 ?d . BIND(YEAR(?d) AS ?year) }
      FILTER(!BOUND(?year) || ?year >= 2020)
    } LIMIT 300`,
}

export async function collectWikidataProducts(
  categories: string[] = ['headphones', 'monitor', 'tv', 'car']
): Promise<{ category: string; inserted: number; skipped: number; error?: string }[]> {
  const supabase = makeService()
  const results = []

  for (const category of categories) {
    const query = QUERIES[category]
    if (!query) { results.push({ category, inserted: 0, skipped: 0, error: 'No query' }); continue }

    const items = await sparqlQuery(query)
    if (items.length === 0) { results.push({ category, inserted: 0, skipped: 0 }); continue }

    // Get existing names in this category to avoid duplicates
    const { data: existing } = await supabase
      .from('products')
      .select('name, brand')
      .eq('category', category)

    const existingKeys = new Set(
      (existing ?? []).map((p: { name: string; brand: string }) =>
        `${p.brand}::${p.name}`.toLowerCase()
      )
    )

    const toInsert = items
      .filter(p => !existingKeys.has(`${p.brand}::${p.name}`.toLowerCase()))
      .map(p => ({
        name: p.name,
        brand: p.brand,
        category,
        is_visible: false,  // admin reviews before publishing
        scrape_status: 'wikidata',
      }))

    const skipped = items.length - toInsert.length

    if (toInsert.length === 0) {
      results.push({ category, inserted: 0, skipped })
      continue
    }

    // Insert in batches of 50
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50)
      const { error } = await supabase.from('products').insert(batch)
      if (!error) inserted += batch.length
    }

    results.push({ category, inserted, skipped })
  }

  return results
}
