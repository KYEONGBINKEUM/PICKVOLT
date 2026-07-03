'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, Users, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { imgUrl } from '@/lib/utils'

interface Clan {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  join_type: 'auto' | 'approval'
  is_private: boolean
  member_count: number
  my_membership: { role: string; status: string } | null
}

export default function ClanDiscoverPage() {
  const { t } = useI18n()
  const [q, setQ]           = useState('')
  const [clans, setClans]   = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken]   = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = `/api/clans${q.trim().length >= 2 ? `?q=${encodeURIComponent(q)}` : ''}`
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    fetch(url, { headers })
      .then(r => r.json())
      .then(d => setClans(d.clans ?? []))
      .finally(() => setLoading(false))
  }, [q, token])

  const handleJoin = async (clan: Clan) => {
    if (!token) return
    const res = await fetch(`/api/clans/${clan.slug}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (res.ok) {
      setClans(prev => prev.map(c => c.id === clan.id
        ? { ...c, my_membership: { role: 'member', status: json.status }, member_count: json.status === 'approved' ? c.member_count + 1 : c.member_count }
        : c
      ))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">{t('clan.discover')}</h1>
          <Link href="/clan/create"
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            {t('clan.create')}
          </Link>
        </div>

        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 mb-6">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('clan.discover')}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
        ) : clans.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-20">{t('clan.no_clans')}</p>
        ) : (
          <div className="space-y-3">
            {clans.map(c => (
              <div key={c.id} className="flex items-center gap-4 bg-surface border border-border rounded-2xl p-4">
                <Link href={`/clan/${c.slug}`} className="flex-shrink-0">
                  {c.avatar_url
                    ? <img src={imgUrl(c.avatar_url, 64)} alt={c.name} className="w-14 h-14 rounded-2xl object-cover" />
                    : <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                        <span className="text-2xl font-black text-accent/60">{c.name[0]?.toUpperCase()}</span>
                      </div>
                  }
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/clan/${c.slug}`}>
                    <h2 className="font-bold text-white hover:text-accent transition-colors">{c.name}</h2>
                  </Link>
                  {c.description && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{c.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-white/30">
                      <Users className="w-3 h-3" />
                      {t('clan.n_members').replace('{n}', String(c.member_count))}
                    </span>
                    <span className="text-[11px] text-white/25">
                      {c.join_type === 'auto' ? t('clan.join_auto') : t('clan.join_approval')}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {c.my_membership?.status === 'approved' ? (
                    <Link href={`/clan/${c.slug}`}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-white/50 hover:text-white hover:border-white/20 transition-colors">
                      {t('clan.joined')}
                    </Link>
                  ) : c.my_membership?.status === 'pending' ? (
                    <span className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-white/30">
                      {t('clan.pending')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoin(c)}
                      className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold transition-colors"
                    >
                      {t('clan.join')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
