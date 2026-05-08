'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Settings, Users, Edit3, Loader2, Lock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { CardPost, PostSkeleton, Pagination, FeedPost } from '@/components/PostFeed'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { imgUrl } from '@/lib/utils'

interface Clan {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  banner_url: string | null
  join_type: 'auto' | 'approval'
  is_private: boolean
  member_count: number
  rules: string[] | null
  created_at: string
  owner_id: string
  my_membership: { role: string; status: string } | null
}

export default function ClanPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const { t } = useI18n()
  const [token, setToken]       = useState<string | null>(null)
  const [userId, setUserId]     = useState<string | null>(null)
  const [clan, setClan]         = useState<Clan | null>(null)
  const [loading, setLoading]   = useState(true)
  const [posts, setPosts]       = useState<FeedPost[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [postsLoading, setPostsLoading] = useState(true)
  const [joining, setJoining]   = useState(false)
  const [leaving, setLeaving]   = useState(false)

  const LIMIT = 20

  const tokenRef = useRef<string | null>(null)
  const clanRef  = useRef<Clan | null>(null)

  // Main init effect
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const tok = data.session?.access_token ?? null
      tokenRef.current = tok
      if (active) { setToken(tok); setUserId(data.session?.user?.id ?? null) }

      const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
      const res = await fetch(`/api/clans/${slug}`, { headers })
      if (!res.ok) { if (active) setLoading(false); return }
      const json = await res.json()
      const clanData = json.clan
      clanRef.current = clanData
      if (active) { setClan(clanData); setLoading(false) }

      // Immediately fetch posts without waiting for React state
      if (active) setPostsLoading(true)
      const postsRes = await fetch(`/api/community/posts?clan_id=${clanData.id}&page=1&limit=${LIMIT}`, { headers })
      const postsJson = await postsRes.json()
      if (active) {
        setPosts(postsJson.posts ?? [])
        setTotal(postsJson.total ?? 0)
        setPostsLoading(false)
      }
    })
    return () => { active = false }
  }, [slug])

  // Page change effect (not initial load)
  useEffect(() => {
    if (page === 1) return
    const cl = clanRef.current
    const tok = tokenRef.current
    if (!cl) return
    setPostsLoading(true)
    const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
    fetch(`/api/community/posts?clan_id=${cl.id}&page=${page}&limit=${LIMIT}`, { headers })
      .then(r => r.json())
      .then(j => { setPosts(j.posts ?? []); setTotal(j.total ?? 0); setPostsLoading(false) })
  }, [page])

  const handleVote = async (postId: string) => {
    if (!token) return
    await fetch(`/api/community/posts/${postId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, my_vote: !p.my_vote, upvotes: p.my_vote ? p.upvotes - 1 : p.upvotes + 1 }
      : p
    ))
  }

  const handleJoin = async () => {
    if (!token || !clan) return
    setJoining(true)
    const res = await fetch(`/api/clans/${clan.slug}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (res.ok) {
      setClan(prev => prev ? {
        ...prev,
        my_membership: { role: 'member', status: json.status },
        member_count: json.status === 'approved' ? prev.member_count + 1 : prev.member_count,
      } : prev)
    }
    setJoining(false)
  }

  const handleLeave = async () => {
    if (!token || !clan) return
    setLeaving(true)
    const res = await fetch(`/api/clans/${clan.slug}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setClan(prev => prev ? {
        ...prev,
        my_membership: null,
        member_count: Math.max(0, prev.member_count - 1),
      } : prev)
    }
    setLeaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex justify-center py-40"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      </div>
    )
  }

  if (!clan) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex justify-center py-40"><p className="text-white/30">{t('post.not_found')}</p></div>
      </div>
    )
  }

  const isMember   = clan.my_membership?.status === 'approved'
  const isPending  = clan.my_membership?.status === 'pending'
  const isOwnerOrMod = isMember && (clan.my_membership?.role === 'owner' || clan.my_membership?.role === 'moderator')
  const isOwner    = clan.owner_id === userId
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Banner */}
      <div className="h-36 md:h-48 relative overflow-hidden bg-gradient-to-br from-accent/20 to-surface mt-[57px] md:mt-[65px]">
        {clan.banner_url && (
          <img src={imgUrl(clan.banner_url, 1400)} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end gap-4 -mt-10 mb-6 relative z-10">
          {clan.avatar_url
            ? <img src={imgUrl(clan.avatar_url, 96)} alt={clan.name} className="w-20 h-20 rounded-2xl object-cover border-4 border-background flex-shrink-0" />
            : <div className="w-20 h-20 rounded-2xl bg-accent/20 border-4 border-background flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-black text-accent/60">{clan.name[0]?.toUpperCase()}</span>
              </div>
          }
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight">{clan.name}</h1>
            <p className="text-sm text-white/40">c/{clan.slug} · {t('clan.n_members').replace('{n}', String(clan.member_count))}</p>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {(isOwnerOrMod || isOwner) && (
              <Link href={`/clan/${clan.slug}/settings`}
                className="p-2 rounded-xl border border-border text-white/40 hover:text-white hover:border-white/20 transition-colors">
                <Settings className="w-4 h-4" />
              </Link>
            )}
            {(isOwnerOrMod || isOwner) && (
              <Link href={`/clan/${clan.slug}/members`}
                className="p-2 rounded-xl border border-border text-white/40 hover:text-white hover:border-white/20 transition-colors">
                <Users className="w-4 h-4" />
              </Link>
            )}
            {isMember && !isOwner && (
              <button onClick={handleLeave} disabled={leaving}
                className="px-4 py-2 rounded-xl border border-border text-white/50 text-xs font-semibold hover:text-white hover:border-white/20 transition-colors disabled:opacity-40">
                {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : t('clan.leave')}
              </button>
            )}
            {isPending && (
              <span className="px-4 py-2 rounded-xl border border-border text-white/30 text-xs font-semibold">{t('clan.pending')}</span>
            )}
            {!clan.my_membership && token && (
              <button onClick={handleJoin} disabled={joining}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center gap-2">
                {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('clan.join')}
              </button>
            )}
            {isMember && (
              <Link href={`/community/write`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-white/60 hover:text-white hover:border-white/20 text-xs font-semibold transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
                {t('write.heading')}
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Posts */}
          <div className="flex-1 min-w-0">
            {postsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-white/30 text-sm">{t('clan.no_posts')}</p>
                {isMember && (
                  <Link href="/community/write"
                    className="mt-4 inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    <Edit3 className="w-4 h-4" />
                    {t('write.heading')}
                  </Link>
                )}
              </div>
            ) : (
              <>
                {posts.map(p => (
                  <CardPost key={p.id} post={p} token={token} onVote={handleVote} t={t} showType={false} />
                ))}
                <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); window.scrollTo(0, 0) }} />
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden sticky top-24">
              <div className="px-4 py-3 border-b border-border/50">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">{t('clan.about')}</h3>
              </div>
              <div className="p-4 space-y-3">
                {clan.description && <p className="text-sm text-white/60 leading-relaxed">{clan.description}</p>}
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Users className="w-4 h-4" />
                  {t('clan.n_members').replace('{n}', String(clan.member_count))}
                </div>
                {clan.join_type === 'approval' && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Lock className="w-4 h-4" />
                    {t('clan.join_approval')}
                  </div>
                )}
                {isMember && (
                  <Link href="/community/write"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-xl transition-colors">
                    <Edit3 className="w-4 h-4" />
                    {t('write.heading')}
                  </Link>
                )}
              </div>

              {clan.rules && clan.rules.length > 0 && (
                <>
                  <div className="px-4 py-3 border-t border-border/50">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">{t('clan.rules')}</h3>
                  </div>
                  <ol className="px-4 pb-4 space-y-2">
                    {clan.rules.map((rule, i) => (
                      <li key={i} className="flex gap-2 text-sm text-white/50">
                        <span className="text-white/25 font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
