'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TechEvent {
  id: string
  name: string
  organizer: string | null
  event_date: string // ISO date
  end_date: string | null
  location: string | null
  url: string | null
  description: string | null
}

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function DateBadge({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + 'T00:00:00')
  const month = MONTH_SHORT[d.getMonth()]
  const day = String(d.getDate()).padStart(2, '0')
  return (
    <div
      className="flex flex-col items-center justify-center rounded border w-9 h-9 shrink-0 text-center"
      style={{ borderColor: 'rgb(255,77,0)', color: 'rgb(255,77,0)' }}
    >
      <span className="text-[9px] font-semibold leading-none">{month}</span>
      <span className="text-xs font-bold leading-tight">{day}</span>
    </div>
  )
}

function EventSkeleton() {
  return (
    <div className="flex items-start gap-2 py-1.5 animate-pulse">
      <div className="w-9 h-9 rounded shrink-0 bg-white/10" />
      <div className="flex-1 space-y-1.5 pt-0.5">
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-2.5 bg-white/10 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function TechEventsWidget() {
  const [events, setEvents] = useState<TechEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => setEvents((d.events ?? []).slice(0, 5)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Tech Events</span>
      </div>

      <div className="space-y-0.5">
        {loading ? (
          <>
            <EventSkeleton />
            <EventSkeleton />
            <EventSkeleton />
          </>
        ) : events.length === 0 ? (
          <p className="text-xs text-white/40 py-2 text-center">No upcoming events</p>
        ) : (
          events.map(ev => {
            const row = (
              <div className="flex items-start gap-2 py-1.5 rounded hover:bg-white/5 transition-colors px-0.5">
                <DateBadge dateStr={ev.event_date} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/90 truncate leading-tight">{ev.name}</p>
                  <p className="text-[10px] text-white/40 truncate leading-tight mt-0.5">
                    {ev.organizer ?? ''}
                    {ev.location && ev.organizer ? ' · ' : ''}
                    {ev.location ?? ''}
                  </p>
                </div>
              </div>
            )
            return ev.url ? (
              <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" className="block">
                {row}
              </a>
            ) : (
              <div key={ev.id}>{row}</div>
            )
          })
        )}
      </div>

      {!loading && events.length > 0 && (
        <Link
          href="/community/events"
          className="block text-center text-[10px] mt-2 py-1 rounded border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
        >
          View all events →
        </Link>
      )}
    </div>
  )
}
