'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutList, LayoutGrid, Pencil } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import BlogCategoryNav from '@/components/BlogCategoryNav'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { CardPost, CompactPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

interface Props {
  initialPosts?: FeedPost[]
  initialTotal?: number
  category?: string
  heading?: string
}

export default function NewsClient({ initialPosts, initialTotal, category, heading }: Props) {
  const { t } = useI18n()
  const [posts, setPosts]             = useState<FeedPost[]>(initialPosts ?? [])
  const [loading, setLoading]         = useState(!initialPosts)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]               = useState(initialPosts ? 2 : 1)
  const [hasMore, setHasMore]         = useState((initialPosts?.length ?? 0) === 25)
  const [total, setTotal]             = useState(initialTotal ?? 0)
  const [token, setToken]             = useState<string | null>(null)
  const [compact, setCompact]         = useState(false)
  const [isAdmin, setIsAdmin]         = useState(false)
  const sentinelRef                   = useRef<HTMLDivElement>(null)
  const tokenRef                      = useRef<string | null>(null)

  const LIMIT = 25

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      tokenRef.current = tok
      const email = (data.session?.user?.email ?? '').toLowerCase()
      setIsAdmin(ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email))
    })
  }, [])

  useEffect(() => {
    if (initialPosts) return
    setLoading(true)
    const initParams = new URLSearchParams({ type: 'news', sort: 'latest', page: '1', limit: String(LIMIT) })
    if (category) initParams.set('category', category)
    fetch(`/api/community/posts?${initParams}`)
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
    const params = new URLSearchParams({ type: 'news', sort: 'latest', page: String(page), limit: String(LIMIT) })
    if (category) params.set('category', category)
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
  }, [page, loadingMore, hasMore, category])

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
        <BlogCategoryNav />
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-lg font-black text-white">{heading ?? t('community.news')}</h1>
          {total > 0 && <span className="text-xs text-white/30">{total.toLocaleString()}</span>}
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Link href="/community/write?type=news" className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-lg transition-colors">
                <Pencil className="w-3 h-3" />
                {t('community.write')}
              </Link>
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
        <div>
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)
            : posts.length === 0
            ? <div className="py-24 text-center"><p className="text-sm text-white/20">{t('board.empty')}</p></div>
            : posts.map(post => (
              compact
                ? <CompactPost key={post.id} post={post} token={token} onVote={handleVote} t={t} showType={false} hideVotes />
                : <CardPost    key={post.id} post={post} token={token} onVote={handleVote} t={t} showType={false} hideVotes />
            ))
          }
        </div>
        <div ref={sentinelRef} className="h-4" />
        {loadingMore && Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)}
      </main>
    </div>
  )
}
