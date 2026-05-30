'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, ExternalLink } from 'lucide-react'
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
  en: 'en-US', es: 'es-ES', pt: 'pt-PT',
  fr: 'fr-FR', de: 'de-DE', ja: 'ja-JP', ko: 'ko-KR',
}

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

function getWeekdays(locale: Locale) {
  if (locale === 'ko') return WEEKDAYS_KO
  if (locale === 'ja') return WEEKDAYS_JA
  return WEEKDAYS_EN
}

function getMonthLabel(year: number, month: number, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'long' }).format(new Date(year, month, 1))
}

function formatRange(start: string, end: string | null, intlLocale: string) {
  const s = new Date(start + 'T00:00:00')
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, opts).format(d)
  if (!end) return fmt(s, { year: 'numeric', month: 'long', day: 'numeric' })
  const e = new Date(end + 'T00:00:00')
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${fmt(s, { month: 'long', day: 'numeric' })}–${fmt(e, { day: 'numeric', year: 'numeric' })}`
  }
  return `${fmt(s, { month: 'short', day: 'numeric' })} – ${fmt(e, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

// Returns all dates an event spans (up to end_date, capped within calendar performance)
function getEventDates(ev: TechEvent): Set<string> {
  const dates = new Set<string>()
  const start = new Date(ev.event_date + 'T00:00:00')
  const end = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : start
  const cur = new Date(start)
  while (cur <= end) {
    dates.add(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default function EventsPage() {
  const { t, locale } = useI18n()
  const intlLocale = LOCALE_MAP[locale] ?? 'en-US'

  const [events, setEvents] = useState<TechEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  useEffect(() => {
    fetch('/api/events?limit=200')
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  // Build a map: dateStr → events[]
  const dateEventMap = new Map<string, TechEvent[]>()
  for (const ev of events) {
    for (const dateStr of getEventDates(ev)) {
      if (!dateEventMap.has(dateStr)) dateEventMap.set(dateStr, [])
      dateEventMap.get(dateStr)!.push(ev)
    }
  }

  // Calendar grid for current view month
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const todayStr = today.toISOString().slice(0, 10)
  const weekdays = getWeekdays(locale)

  const selectedEvents = selectedDate ? (dateEventMap.get(selectedDate) ?? []) : []

  // Events for current month (for the right panel when nothing selected)
  const monthEventsAll: TechEvent[] = []
  const seen = new Set<string>()
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    for (const ev of (dateEventMap.get(ds) ?? [])) {
      if (!seen.has(ev.id)) { seen.add(ev.id); monthEventsAll.push(ev) }
    }
  }

  const panelEvents = selectedDate ? selectedEvents : monthEventsAll

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">

        {/* Page header */}
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="w-5 h-5" style={{ color: 'rgb(255,77,0)' }} />
          <h1 className="text-xl font-black text-white">{t('events.calendar')}</h1>
          {!loading && (
            <span className="ml-2 text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
              {events.length}
            </span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Calendar ── */}
          <div className="lg:w-[420px] shrink-0">
            <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">

              {/* Month navigation */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <button onClick={prevMonth}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white">
                  {getMonthLabel(viewYear, viewMonth, intlLocale)}
                </span>
                <button onClick={nextMonth}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 px-3 pt-3">
                {weekdays.map(wd => (
                  <div key={wd} className="text-center text-[10px] font-bold text-white/25 pb-2">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-px px-3 pb-4">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayEvents = dateEventMap.get(ds) ?? []
                  const isToday = ds === todayStr
                  const isSelected = ds === selectedDate
                  const hasEvent = dayEvents.length > 0

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(isSelected ? null : ds)}
                      className={[
                        'relative flex flex-col items-center py-1.5 rounded-xl transition-all group',
                        isSelected
                          ? 'bg-accent/20 ring-1 ring-accent/40'
                          : isToday
                          ? 'ring-1 ring-white/20 hover:bg-white/5'
                          : 'hover:bg-white/5',
                      ].join(' ')}
                    >
                      <span className={[
                        'text-xs font-semibold leading-none',
                        isSelected ? 'text-accent' : isToday ? 'text-white' : 'text-white/60',
                      ].join(' ')}>
                        {day}
                      </span>
                      {/* Event dots */}
                      {hasEvent && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[36px]">
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <span
                              key={idx}
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: isSelected ? 'rgb(255,77,0)' : 'rgba(255,77,0,0.6)' }}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-white/30 leading-none">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 px-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(255,77,0)' }} />
              <span className="text-xs text-white/30">{t('events.tech_events')}</span>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)}
                  className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors">
                  ✕ {selectedDate}
                </button>
              )}
            </div>
          </div>

          {/* ── Event list panel ── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface border border-border/50 rounded-2xl p-4 h-24 animate-pulse" />
                ))}
              </div>
            ) : panelEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <CalendarDays className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-sm text-white/30">{t('events.no_upcoming')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {panelEvents.map(ev => (
                  <EventRow key={ev.id} ev={ev} intlLocale={intlLocale} t={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function EventRow({ ev, intlLocale, t }: {
  ev: TechEvent
  intlLocale: string
  t: (k: string) => string
}) {
  const d = new Date(ev.event_date + 'T00:00:00')
  const day = d.getDate()
  const month = new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(d).toUpperCase()

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-4 flex gap-4 hover:border-white/15 hover:bg-white/[0.02] transition-all">
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center rounded-xl w-12 h-12 shrink-0 bg-accent/10">
        <span className="text-[9px] font-bold leading-none" style={{ color: 'rgb(255,77,0)' }}>{month}</span>
        <span className="text-lg font-black leading-tight" style={{ color: 'rgb(255,77,0)' }}>{day}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white leading-snug">{ev.name}</h3>
        {ev.organizer && <p className="text-xs text-white/40 mt-0.5">{ev.organizer}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <span className="flex items-center gap-1 text-xs text-white/40">
            <CalendarDays className="w-3 h-3 text-white/25" />
            {formatRange(ev.event_date, ev.end_date, intlLocale)}
          </span>
          {ev.location && (
            <span className="flex items-center gap-1 text-xs text-white/35">
              <MapPin className="w-3 h-3 text-white/20" />
              {ev.location}
            </span>
          )}
        </div>

        {ev.description && (
          <p className="text-xs text-white/30 mt-1.5 line-clamp-2 leading-relaxed">{ev.description}</p>
        )}
      </div>

      {/* Visit link */}
      {ev.url && (
        <a
          href={ev.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-colors self-start mt-0.5"
        >
          <ExternalLink className="w-3 h-3" />
          {t('events.visit_site')}
        </a>
      )}
    </div>
  )
}
