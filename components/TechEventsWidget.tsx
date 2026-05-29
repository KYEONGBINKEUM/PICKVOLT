'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          {t('events.tech_events')}
        </span>
        {!loading && events.length > 0 && (
          <Link
            href="/community/events"
            className="text-[10px] text-white/25 hover:text-accent transition-colors"
          >
            {t('events.view_all')}
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-2 bg-white/10 rounded w-1/4" />
              <div className="h-3 bg-white/10 rounded w-full" />
              <div className="h-2 bg-white/10 rounded w-3/5" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-[11px] text-white/25 py-2 text-center">{t('events.no_upcoming')}</p>
      ) : (
        <div className="space-y-0.5">
          {events.map(ev => {
            const d = new Date(ev.event_date + 'T00:00:00')
            const dateStr = `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`
            const meta = [ev.organizer, ev.location].filter(Boolean).join(' · ')

            const inner = (
              <div className="px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors -mx-2 cursor-pointer">
                <div
                  className="text-[10px] font-bold leading-none mb-1 tracking-wide"
                  style={{ color: 'rgb(255,77,0)' }}
                >
                  {dateStr}
                </div>
                <div className="text-[11px] font-semibold text-white/85 leading-snug line-clamp-1">
                  {ev.name}
                </div>
                {meta && (
                  <div className="text-[10px] text-white/30 leading-tight mt-0.5 truncate">
                    {meta}
                  </div>
                )}
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
