'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Loader2, Search } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { CardPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'

interface ClanResult {
  id: string
  slug: string
  name: string
  avatar_url: string | null
  member_count: number
}

function SearchResults({ q }: { q: string }) {
  const { t } = useI18n()

  const [clans, setClans] = useState<ClanResult[]>([])
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      tokenRef.current = tok
    })
  }, [])

  useEffect(() => {
    if (!q.trim()) return
    setLoading(true)
    setClans([])
    setPosts([])

    // Parallel: search API (clans) + posts API (by keyword)
    Promise.all([
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/community/posts?q=${encodeURIComponent(q)}&limit=20`, {
        headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
      }).then(r => r.ok ? r.json() : null),
    ]).then(([searchData, postsData]) => {
      setClans(searchData?.clans ?? [])
      setPosts(postsData?.posts ?? [])
    }).finally(() => setLoading(false))
  }, [q])

  const handleVote = async (postId: string) => {
    if (!token) return
    const res = await fetch(`/api/community/posts/${postId}/vote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, upvotes: d.upvotes, my_vote: d.voted } : p))
    }
  }

  if (!q.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Search className="w-8 h-8 text-white/15" />
        <p className="text-sm text-white/30">{t('search.community_placeholder')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* 클랜 캐러셀 */}
      {(clans.length > 0 || loading) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{t('clan.title')}</span>
            {clans.length > 0 && (
              <Link href={`/clan?q=${encodeURIComponent(q)}`}
                className="flex items-center gap-1 text-xs text-accent/70 hover:text-accent transition-colors">
                {t('community.more')} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-28 h-28 rounded-2xl bg-surface animate-pulse" />
              ))}
            </div>
          ) : (
            <div ref={carouselRef}
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none' }}>
              {clans.map(c => (
                <Link key={c.id} href={`/clan/${c.slug}`}
                  className="flex-shrink-0 flex flex-col items-center gap-2 w-24 group">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface border border-border group-hover:border-white/20 transition-colors flex items-center justify-center flex-shrink-0">
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-lg font-black text-white/30">{c.name[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <span className="text-xs text-white/60 group-hover:text-white transition-colors text-center line-clamp-2 leading-tight">
                    {c.name}
                  </span>
                  {c.member_count > 0 && (
                    <span className="text-[10px] text-white/25">{c.member_count.toLocaleString()} {t('clan.members_count')}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 게시물 결과 */}
      <div>
        {loading ? (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm text-white/25">{t('search.no_results')}</p>
          </div>
        ) : (
          <div className="space-y-px">
            {posts.map(post => (
              <CardPost key={post.id} post={post} token={token} onVote={handleVote} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchPageInner() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-4 h-4 text-white/30" />
          <h1 className="text-sm text-white/50">
            <span className="text-white font-bold">"{q}"</span>
            {' '}{t('search.result_for')}
          </h1>
        </div>
        <SearchResults q={q} />
      </div>
    </div>
  )
}

export default function CommunitySearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SearchPageInner />
    </Suspense>
  )
}
