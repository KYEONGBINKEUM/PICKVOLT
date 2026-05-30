'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, ExternalLink, X } from 'lucide-react'
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

function getEventDates(ev: TechEvent): string[] {
  const dates: string[] = []
  const start = new Date(ev.event_date + 'T00:00:00')
  const end = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : start
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
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
  const [selectedEvent, setSelectedEvent] = useState<TechEvent | null>(null)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    fetch('/api/events?limit=200')
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  // dateStr → events[]
  const dateEventMap = new Map<string, TechEvent[]>()
  for (const ev of events) {
    for (const dateStr of getEventDates(ev)) {
      if (!dateEventMap.has(dateStr)) dateEventMap.set(dateStr, [])
      dateEventMap.get(dateStr)!.push(ev)
    }
  }

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
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

  const selectedDayEvents = selectedDate ? (dateEventMap.get(selectedDate) ?? []) : []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="w-5 h-5" style={{ color: 'rgb(255,77,0)' }} />
          <h1 className="text-xl font-black text-white">{t('events.calendar')}</h1>
          {!loading && (
            <span className="ml-2 text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
              {events.length}
            </span>
          )}
        </div>

        {/* ── Full-width calendar ── */}
        <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
            <button onClick={prevMonth}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-bold text-white">
              {getMonthLabel(viewYear, viewMonth, intlLocale)}
            </span>
            <button onClick={nextMonth}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border/30">
            {weekdays.map(wd => (
              <div key={wd} className="py-3 text-center text-xs font-bold text-white/25 tracking-widest uppercase">
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/20">
            {cells.map((day, i) => {
              if (!day) return (
                <div key={i} className="min-h-[100px] bg-white/[0.01]" />
              )

              const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEvents = dateEventMap.get(ds) ?? []
              const isToday = ds === todayStr
              const isSelected = ds === selectedDate
              const hasEvent = dayEvents.length > 0

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : ds)}
                  className={[
                    'min-h-[100px] p-2 flex flex-col cursor-pointer transition-colors',
                    isSelected ? 'bg-accent/8' : isToday ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]',
                  ].join(' ')}
                >
                  {/* Day number */}
                  <span className={[
                    'w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 shrink-0',
                    isSelected
                      ? 'bg-accent text-white'
                      : isToday
                      ? 'ring-1 ring-accent text-accent'
                      : 'text-white/50',
                  ].join(' ')}>
                    {day}
                  </span>

                  {/* Event chips */}
                  <div className="flex flex-col gap-0.5 flex-1">
                    {dayEvents.slice(0, 3).map(ev => (
                      <button
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); setSelectedEvent(ev) }}
                        className="text-left w-full px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight truncate transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,77,0,0.18)', color: 'rgba(255,120,50,1)' }}
                        title={ev.name}
                      >
                        {ev.name}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-white/25 pl-1.5">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Selected date event list ── */}
        {selectedDate && selectedDayEvents.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-white/70">
                {new Intl.DateTimeFormat(intlLocale, { month: 'long', day: 'numeric' }).format(
                  new Date(selectedDate + 'T00:00:00')
                )}
              </span>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{selectedDayEvents.length}</span>
              <button onClick={() => setSelectedDate(null)} className="ml-auto text-white/25 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedDayEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} intlLocale={intlLocale} t={t} />
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ── Event detail modal ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-surface border border-border/60 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center rounded-xl w-12 h-12 shrink-0 bg-accent/10">
                  <span className="text-[9px] font-bold leading-none" style={{ color: 'rgb(255,77,0)' }}>
                    {new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(new Date(selectedEvent.event_date + 'T00:00:00')).toUpperCase()}
                  </span>
                  <span className="text-lg font-black leading-tight" style={{ color: 'rgb(255,77,0)' }}>
                    {new Date(selectedEvent.event_date + 'T00:00:00').getDate()}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-snug">{selectedEvent.name}</h2>
                  {selectedEvent.organizer && <p className="text-xs text-white/40 mt-0.5">{selectedEvent.organizer}</p>}
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <CalendarDays className="w-3.5 h-3.5 text-white/25" />
                {formatRange(selectedEvent.event_date, selectedEvent.end_date, intlLocale)}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <MapPin className="w-3.5 h-3.5 text-white/20" />
                  {selectedEvent.location}
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <p className="text-xs text-white/35 leading-relaxed mb-4">{selectedEvent.description}</p>
            )}

            {selectedEvent.url && (
              <a
                href={selectedEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:text-white hover:border-white/25 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('events.visit_site')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ ev, intlLocale, t }: {
  ev: TechEvent
  intlLocale: string
  t: (k: string) => string
}) {
  const d = new Date(ev.event_date + 'T00:00:00')
  const day = d.getDate()
  const month = new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(d).toUpperCase()

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-4 flex gap-4 hover:border-white/15 transition-all">
      <div className="flex flex-col items-center justify-center rounded-xl w-12 h-12 shrink-0 bg-accent/10">
        <span className="text-[9px] font-bold leading-none" style={{ color: 'rgb(255,77,0)' }}>{month}</span>
        <span className="text-lg font-black leading-tight" style={{ color: 'rgb(255,77,0)' }}>{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white leading-snug">{ev.name}</h3>
        {ev.organizer && <p className="text-xs text-white/40 mt-0.5">{ev.organizer}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
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
      </div>
      {ev.url && (
        <a href={ev.url} target="_blank" rel="noopener noreferrer"
          className="shrink-0 self-start mt-0.5 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-colors">
          <ExternalLink className="w-3 h-3" />
          {t('events.visit_site')}
        </a>
      )}
    </div>
  )
}
