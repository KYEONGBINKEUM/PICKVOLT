import { createClient } from '@supabase/supabase-js'

// confs.tech GitHub dataset: https://github.com/tech-conferences/conference-data
const BASE_URL = 'https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences'

// Topics relevant to consumer/developer tech
const TOPICS = ['general', 'ios', 'android', 'javascript', 'data', 'ux', 'security', 'devops']

interface ConfsEvent {
  name: string
  url?: string
  startDate: string
  endDate?: string
  city?: string
  country?: string
  twitter?: string
  cfpUrl?: string
  cfpEndDate?: string
}

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function fetchTopic(year: number, topic: string): Promise<ConfsEvent[]> {
  try {
    const res = await fetch(`${BASE_URL}/${year}/${topic}.json`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function collectTechEvents(): Promise<{ inserted: number; skipped: number; error?: string }> {
  const supabase = makeService()
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1

  // Fetch from confs.tech for this year and next
  const allConfs: ConfsEvent[] = []
  for (const year of [currentYear, nextYear]) {
    for (const topic of TOPICS) {
      const items = await fetchTopic(year, topic)
      allConfs.push(...items)
    }
  }

  // Deduplicate by URL (same event can appear in multiple topics)
  const seenUrls = new Set<string>()
  const unique = allConfs.filter(c => {
    if (!c.url) return false
    if (seenUrls.has(c.url)) return false
    seenUrls.add(c.url)
    return true
  })

  // Only upcoming events
  const upcoming = unique.filter(c => c.startDate >= today)

  if (upcoming.length === 0) {
    return { inserted: 0, skipped: 0 }
  }

  // Fetch existing URLs to avoid duplicates
  const { data: existing, error: fetchError } = await supabase
    .from('tech_events')
    .select('url')

  if (fetchError) {
    return { inserted: 0, skipped: 0, error: fetchError.message }
  }

  const existingUrls = new Set(
    (existing ?? []).map((e: { url: string | null }) => e.url).filter(Boolean) as string[]
  )

  // Build insert payload for new events only
  const toInsert = upcoming
    .filter(c => c.url && !existingUrls.has(c.url!))
    .map(c => ({
      name: c.name,
      organizer: c.twitter ? `@${c.twitter.replace(/^@/, '')}` : null,
      event_date: c.startDate,
      end_date: c.endDate ?? null,
      location: [c.city, c.country].filter(Boolean).join(', ') || null,
      url: c.url ?? null,
      description: null,
      is_approved: true,
      is_recurring: false,
    }))

  const skipped = upcoming.length - toInsert.length

  if (toInsert.length === 0) {
    return { inserted: 0, skipped }
  }

  const { error: insertError } = await supabase
    .from('tech_events')
    .insert(toInsert)

  if (insertError) {
    return { inserted: 0, skipped, error: insertError.message }
  }

  return { inserted: toInsert.length, skipped }
}
