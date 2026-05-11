'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutList, LayoutGrid } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { CardPost, CompactPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'
import AdBanner from '@/components/AdBanner'

const AD_HTML_INLINE = process.env.NEXT_PUBLIC_AD_BANNER_INLINE ?? ''

function generateAdIndices(max = 200): Set<number> {
  const set = new Set<number>()
  let pos = 9
  while (pos < max) {
    set.add(pos)
    pos += Math.floor(Math.random() * 21) + 20
  }
  return set
}

interface Props {
  initialPosts?: FeedPost[]
  initialTotal?: number
}

export default function CommunityClient({ initialPosts, initialTotal }: Props) {
  const { t } = useI18n()
  const [posts, setPosts]             = useState<FeedPost[]>(initialPosts ?? [])
  const [loading, setLoading]         = useState(!initialPosts)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]               = useState(initialPosts ? 2 : 1)
  const [hasMore, setHasMore]         = useState((initialPosts?.length ?? 0) === 25)
  const [total, setTotal]             = useState(initialTotal ?? 0)
  const [token, setToken]             = useState<string | null>(null)
  const [compact, setCompact]         = useState(false)
  const [adIndices]                   = useState<Set<number>>(() => generateAdIndices())
  const sentinelRef                   = useRef<HTMLDivElement>(null)
  const tokenRef                      = useRef<string | null>(null)

  const LIMIT = 25

  // auth는 백그라운드로 로드 — 포스트 렌더링과 무관하게
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      tokenRef.current = tok
    })
  }, [])

  // 서버 초기 데이터 없을 때만 첫 fetch
  useEffect(() => {
    if (initialPosts) return
    setLoading(true)
    fetch(`/api/community/posts?sort=latest&page=1&limit=${LIMIT}`)
      .then(r => r.json())
      .then(d => {
        const fetched = d.posts ?? []
        setPosts(fetched)
        setTotal(d.total ?? 0)
        setHasMore(fetched.length === LIMIT && fetched.length < (d.total ?? 0))
        setPage(2)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const params = new URLSearchParams({ sort: 'latest', page: String(page), limit: String(LIMIT) })
    const headers: Record<string, string> = {}
    if (tokenRef.current) headers['Authorization'] = `Bearer ${tokenRef.current}`
    fetch(`/api/community/posts?${params}`, { headers })
      .then(r => r.json())
      .then(d => {
        const fetched = d.posts ?? []
        setPosts(prev => [...prev, ...fetched])
        setHasMore(fetched.length === LIMIT)
        setPage(p => p + 1)
      })
      .finally(() => setLoadingMore(false))
  }, [page, loadingMore, hasMore])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">
        <div className="flex items-center justify-between mb-3">
          {total > 0 && <span className="text-xs text-white/30">{total.toLocaleString()}</span>}
          <div className="ml-auto flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
            <button onClick={() => setCompact(false)} className={`p-1.5 rounded-md transition-colors ${!compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCompact(true)} className={`p-1.5 rounded-md transition-colors ${compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)
            : posts.length === 0
            ? <div className="py-24 text-center"><p className="text-sm text-white/20">{t('board.empty')}</p></div>
            : posts.flatMap((post, idx) => {
                const card = compact
                  ? <CompactPost key={post.id} post={post} token={token} onVote={handleVote} t={t} showType />
                  : <CardPost    key={post.id} post={post} token={token} onVote={handleVote} t={t} showType />
                const showAd = AD_HTML_INLINE && adIndices.has(idx) && idx < posts.length - 1
                return showAd
                  ? [card, <div key={`ad-${idx}`} className="my-3 w-full"><AdBanner html={AD_HTML_INLINE} adWidth={728} adHeight={90} className="rounded-2xl overflow-hidden" /></div>]
                  : [card]
              })
          }
        </div>

        <div ref={sentinelRef} className="h-4" />
        {loadingMore && Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)}
      </div>
    </div>
  )
}
