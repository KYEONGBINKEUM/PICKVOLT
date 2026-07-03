'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { CardPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'

function SearchResults({ q }: { q: string }) {
  const { t } = useI18n()

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

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
    setPosts([])

    fetch(`/api/community/posts?q=${encodeURIComponent(q)}&limit=20`, {
      headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
    }).then(r => r.ok ? r.json() : null)
      .then(postsData => setPosts(postsData?.posts ?? []))
      .finally(() => setLoading(false))
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
              <CardPost key={post.id} post={post} token={token} onVote={handleVote} t={t} showType={false} hideVotes />
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
