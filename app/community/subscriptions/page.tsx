'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutGrid, LayoutList } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { CardPost, CompactPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

const LIMIT = 25

export default function SubscriptionsPage() {
  const { t } = useI18n()
  const [posts, setPosts]         = useState<FeedPost[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(true)
  const [total, setTotal]         = useState(0)
  const [sort, setSort]           = useState('latest')
  const [compact, setCompact]     = useState(false)
  const [token, setToken]         = useState<string | null>(null)
  const [tokenReady, setTokenReady] = useState(false)
  const [loggedIn, setLoggedIn]   = useState(false)
  const tokenRef = useRef<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const SORTS = [
    { key: 'latest', label: t('sort.latest') },
    { key: 'hot',    label: t('sort.hot') },
    { key: 'top',    label: t('sort.top') },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      tokenRef.current = tok
      setLoggedIn(!!tok)
      setTokenReady(true)
    })
  }, [])

  const reset = useCallback((currentSort: string) => {
    if (!tokenRef.current) return
    setLoading(true)
    setPosts([])
    setPage(1)
    setHasMore(true)
    const params = new URLSearchParams({ sort: currentSort, page: '1', limit: String(LIMIT) })
    fetch(`/api/channels/feed?${params}`, {
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    })
      .then(r => r.json())
      .then(d => {
        const fetched = d.posts ?? []
        setPosts(fetched)
        setTotal(d.total ?? 0)
        setHasMore(fetched.length === LIMIT && fetched.length < (d.total ?? 0))
        setPage(2)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!tokenReady) return
    if (!loggedIn) { setLoading(false); return }
    reset(sort)
  }, [tokenReady, loggedIn, sort, reset])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !tokenRef.current) return
    setLoadingMore(true)
    const params = new URLSearchParams({ sort, page: String(page), limit: String(LIMIT) })
    fetch(`/api/channels/feed?${params}`, {
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    })
      .then(r => r.json())
      .then(d => {
        const fetched = d.posts ?? []
        setPosts(prev => [...prev, ...fetched])
        setHasMore(fetched.length === LIMIT)
        setPage(p => p + 1)
      })
      .finally(() => setLoadingMore(false))
  }, [sort, page, loadingMore, hasMore])

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
      <main className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-lg font-black text-white">{t('community.subscriptions')}</h1>
          {total > 0 && <span className="text-xs text-white/30">{total.toLocaleString()}</span>}
          <div className="ml-auto flex items-center gap-2">
            {loggedIn && (
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-white/60 outline-none cursor-pointer hover:border-white/20 transition-colors">
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            )}
            <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
              <button onClick={() => setCompact(false)} className={`p-1.5 rounded-md transition-colors ${!compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCompact(true)} className={`p-1.5 rounded-md transition-colors ${compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {!tokenReady || loading ? (
          <div>{Array.from({ length: 10 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)}</div>
        ) : !loggedIn ? (
          <div className="py-24 text-center">
            <p className="text-sm text-white/30 mb-4">{t('channel.feed_login')}</p>
            <Link href="/login" className="px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: 'rgb(255,77,0)' }}>
              {t('auth.signin')}
            </Link>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm text-white/20">{t('channel.feed_empty')}</p>
          </div>
        ) : (
          <div>
            {posts.map(post =>
              compact
                ? <CompactPost key={post.id} post={post} token={token} onVote={handleVote} t={t} showType />
                : <CardPost    key={post.id} post={post} token={token} onVote={handleVote} t={t} showType />
            )}
          </div>
        )}

        <div ref={sentinelRef} className="h-4" />
        {loadingMore && Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)}
      </main>
    </div>
  )
}
