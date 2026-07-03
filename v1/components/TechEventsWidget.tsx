'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface TechEvent {
  id: string
  name: string
  organizer: string | null
  event_date: string
  end_date: string | null
  location: string | null
  url: string | null
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export default function TechEventsWidget() {
  const { t } = useI18n()
  const [events, setEvents] = useState<TechEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => setEvents((d.events ?? []).slice(0, 3)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full">
      {/* Header — px-3 to match clan section */}
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          {t('events.tech_events')}
        </span>
        {!loading && events.length > 0 && (
          <Link
            href="/community/events"
            className="text-white/30 hover:text-accent transition-colors"
            title={t('events.view_all')}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3 px-3 pt-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-2 bg-white/10 rounded w-1/4" />
              <div className="h-3 bg-white/10 rounded w-full" />
              <div className="h-2 bg-white/10 rounded w-3/5" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-[11px] text-white/25 py-2 text-center px-3">{t('events.no_upcoming')}</p>
      ) : (
        <div className="space-y-0.5">
          {events.map(ev => {
            const d = new Date(ev.event_date + 'T00:00:00')
            const dateStr = `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`
            const meta = [ev.organizer, ev.location].filter(Boolean).join(' · ')

            const inner = (
              <div className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className="shrink-0 mt-0.5">
                  <div
                    className="text-[10px] font-bold leading-none tracking-wide"
                    style={{ color: 'rgb(255,77,0)' }}
                  >
                    {dateStr}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-white/85 leading-snug truncate">
                    {ev.name}
                  </div>
                  {meta && (
                    <div className="text-[10px] text-white/30 leading-tight mt-0.5 truncate">
                      {meta}
                    </div>
                  )}
                </div>
              </div>
            )

            return ev.url ? (
              <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" className="block">
                {inner}
              </a>
            ) : (
              <div key={ev.id}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
