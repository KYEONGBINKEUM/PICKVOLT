'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface SearchResult {
  posts: { id: string; type: string; title: string }[]
  clans: { id: string; slug: string; name: string; avatar_url: string | null }[]
}

export default function CommunitySearchBar() {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!q.trim()) { setRes(null); setOpen(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setOpen(true)
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (r.ok) setRes(await r.json())
      } finally { setSearching(false) }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const clear = () => { setQ(''); setRes(null); setOpen(false) }

  const hasResults = res && (res.clans.length > 0 || res.posts.length > 0)

  return (
    <div ref={wrapRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 bg-surface border border-border rounded-full px-3.5 py-2 focus-within:border-white/20 transition-colors">
        {searching
          ? <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />
          : <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        }
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder={t('search.community_placeholder')}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none min-w-0"
          autoComplete="off"
        />
        {q && (
          <button type="button" onClick={clear} className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && (searching || hasResults || (res && !searching)) && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-background border border-border rounded-2xl overflow-hidden z-50 shadow-2xl max-h-72 overflow-y-auto">
          {searching && <div className="px-4 py-3 text-xs text-white/30">...</div>}

          {res && !searching && !hasResults && (
            <div className="px-4 py-3 text-xs text-white/30">{t('search.no_results')}</div>
          )}

          {res && res.clans.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-white/25 uppercase tracking-widest">{t('clan.title')}</p>
              {res.clans.map(c => (
                <Link key={c.id} href={`/clan/${c.slug}`} onClick={clear}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors">
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    : <span className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent/70 flex-shrink-0">{c.name[0]?.toUpperCase()}</span>
                  }
                  <span className="text-xs text-white/80 truncate">{c.name}</span>
                </Link>
              ))}
            </>
          )}

          {res && res.posts.length > 0 && (
            <>
              <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-white/25 uppercase tracking-widest">{t('community.all')}</p>
              {res.posts.map(p => (
                <Link key={p.id} href={`/community/posts/${p.id}`} onClick={clear}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors">
                  <span className="text-[10px] text-accent/60 font-bold uppercase flex-shrink-0 w-10 truncate">{p.type}</span>
                  <span className="text-xs text-white/70 truncate">{p.title}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
