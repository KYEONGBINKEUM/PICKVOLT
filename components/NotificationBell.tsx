'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  link: string
  is_read: boolean
  actor_name: string | null
  actor_avatar: string | null
  created_at: string
}

function relTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function getNotifText(notif: Notif, t: (k: string) => string) {
  const name = notif.actor_name ?? ''
  switch (notif.type) {
    case 'comment': return t('notif.comment').replace('{name}', name)
    case 'reply': return t('notif.reply').replace('{name}', name)
    case 'clan_post': return t('notif.clan_post').replace('{clan}', notif.body ?? '')
    case 'subscription_post': return t('notif.subscription_post').replace('{name}', name)
    case 'upvote': return t('notif.upvote').replace('{name}', name)
    default: return notif.title
  }
}

export default function NotificationBell() {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      if (!tok) return
      // Prefetch full list immediately (not just unread count)
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${tok}` } })
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (!j) return
          setUnreadCount(j.unread_count ?? 0)
          setNotifs(j.notifications ?? [])
          setLoaded(true)
        })
    })
  }, [])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (!j) return
          setUnreadCount(j.unread_count ?? 0)
          // Only update notifs list if panel is closed (don't disrupt open panel)
          if (!open) setNotifs(j.notifications ?? [])
        })
    }, 60000)
    return () => clearInterval(interval)
  }, [token, open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = useCallback(async () => {
    if (!token) return
    if (!loaded) {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const json = await res.json()
        setNotifs(json.notifications ?? [])
        setUnreadCount(json.unread_count ?? 0)
        setLoaded(true)
      }
    }
    setOpen(v => !v)
  }, [token, loaded])

  const handleMarkAll = async () => {
    if (!token) return
    await fetch('/api/notifications', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleClick = (notif: Notif) => {
    setOpen(false)
    if (!notif.is_read && token) {
      fetch(`/api/notifications/${notif.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    router.push(notif.link)
  }

  if (!token) return null

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className="relative p-1.5 text-white/40 hover:text-white transition-colors">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-accent rounded-full text-[9px] font-black text-white flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm font-bold text-white">{t('notif.title')}</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll}
                className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                {t('notif.mark_all')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-white/25">{t('notif.empty')}</p>
              </div>
            ) : (
              notifs.map(notif => (
                <button key={notif.id} onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/4 transition-colors text-left border-b border-border/30 last:border-0 ${!notif.is_read ? 'bg-accent/5' : ''}`}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-surface-2 mt-0.5">
                    {notif.actor_avatar
                      ? <img src={notif.actor_avatar} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs text-white/30 font-bold bg-surface">
                          {(notif.actor_name ?? '?')[0]?.toUpperCase()}
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 leading-snug line-clamp-2">
                      {getNotifText(notif, t)}
                    </p>
                    {notif.title && (
                      <p className="text-[11px] text-white/35 mt-0.5 truncate">{notif.title}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-white/25">{relTime(notif.created_at)}</span>
                    {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
