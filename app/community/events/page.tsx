'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, CalendarDays, MapPin, ExternalLink } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n, type Locale } from '@/lib/i18n'

interface TechEvent {
  id: string
  name: string
  organizer: string | null
  event_date: string
  end_date: string | null
  location: string | null
  url: string | null
  description: string | null
}

const LOCALE_MAP: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-PT',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
}

const MONTH_SHORT_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatDateRange(start: string, end: string | null, intlLocale: string): string {
  const s = new Date(start + 'T00:00:00')
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, opts).format(d)

  if (!end) {
    return fmt(s, { year: 'numeric', month: 'long', day: 'numeric' })
  }
  const e = new Date(end + 'T00:00:00')
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    // Same month: "June 1–5, 2026" / "2026년 6월 1~5일"
    const startDay = fmt(s, { month: 'long', day: 'numeric' })
    const endDay = fmt(e, { day: 'numeric', year: 'numeric' })
    return `${startDay}–${endDay}`
  }
  return `${fmt(s, { month: 'short', day: 'numeric' })} – ${fmt(e, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function monthGroupLabel(key: string, intlLocale: string): string {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'long' }).format(d)
}

function groupByMonth(events: TechEvent[]): Map<string, TechEvent[]> {
  const map = new Map<string, TechEvent[]>()
  for (const ev of events) {
    const d = new Date(ev.event_date + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }
  return map
}

function EventCard({ ev, intlLocale }: { ev: TechEvent; intlLocale: string }) {
  const d = new Date(ev.event_date + 'T00:00:00')
  const month = MONTH_SHORT_EN[d.getMonth()]
  const day = String(d.getDate()).padStart(2, '0')

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/15 hover:bg-white/[0.02] transition-all">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center rounded-xl w-12 h-12 shrink-0 bg-accent/10">
          <span className="text-[9px] font-bold leading-none" style={{ color: 'rgb(255,77,0)' }}>{month}</span>
          <span className="text-lg font-black leading-tight" style={{ color: 'rgb(255,77,0)' }}>{day}</span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-sm font-bold text-white leading-snug">{ev.name}</h3>
          {ev.organizer && <p className="text-xs text-white/40 mt-0.5">{ev.organizer}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <CalendarDays className="w-3 h-3 shrink-0 text-white/30" />
          <span>{formatDateRange(ev.event_date, ev.end_date, intlLocale)}</span>
        </div>
        {ev.location && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <MapPin className="w-3 h-3 shrink-0 text-white/20" />
            <span>{ev.location}</span>
          </div>
        )}
      </div>

      {ev.description && (
        <p className="text-xs text-white/35 leading-relaxed line-clamp-2">{ev.description}</p>
      )}

      {ev.url && (
        <a
          href={ev.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold self-start px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors mt-auto"
        >
          <ExternalLink className="w-3 h-3" />
          {/* visit site label handled inline since this is client */}
          Visit site
        </a>
      )}
    </div>
  )
}

export default function EventsPage() {
  const { t, locale } = useI18n()
  const intlLocale = LOCALE_MAP[locale] ?? 'en-US'

  const [events, setEvents] = useState<TechEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events?limit=100')
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = groupByMonth(events)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/community" className="text-white/30 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <CalendarDays className="w-5 h-5" style={{ color: 'rgb(255,77,0)' }} />
          <h1 className="text-xl font-black text-white">{t('events.calendar')}</h1>
          {!loading && (
            <span className="ml-auto text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
              {events.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-10">
            {[1, 2].map(g => (
              <section key={g} className="space-y-3">
                <div className="h-3 bg-white/10 rounded w-32 animate-pulse" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface border border-border/50 rounded-2xl p-4 h-36 animate-pulse" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <CalendarDays className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">{t('events.no_upcoming')}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Array.from(grouped.entries()).map(([key, monthEvents]) => (
              <section key={key}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    {monthGroupLabel(key, intlLocale)}
                  </h2>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] text-white/20">{monthEvents.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {monthEvents.map(ev => (
                    <EventCard key={ev.id} ev={ev} intlLocale={intlLocale} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
