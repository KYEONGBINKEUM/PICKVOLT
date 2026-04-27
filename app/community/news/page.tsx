'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayoutList, LayoutGrid, Pencil } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { CardPost, CompactPost, PostSkeleton, Pagination, type FeedPost } from '@/components/PostFeed'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export default function NewsPage() {
  const { t } = useI18n()
  const [posts, setPosts]     = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [token, setToken]           = useState<string | null>(null)
  const [tokenReady, setTokenReady] = useState(false)
  const [compact, setCompact]       = useState(false)
  const [isAdmin, setIsAdmin]       = useState(false)

  const LIMIT = 25

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
      const email = (data.session?.user?.email ?? '').toLowerCase()
      setIsAdmin(ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email))
      setTokenReady(true)
    })
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: 'news', sort: 'latest', page: String(page), limit: String(LIMIT) })
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    fetch(`/api/community/posts?${params}`, { headers })
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, token])

  useEffect(() => { if (tokenReady) load() }, [load, tokenReady])

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

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-lg font-black text-white">{t('community.news')}</h1>
          {total > 0 && <span className="text-xs text-white/30">{total.toLocaleString()}</span>}
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/community/write?type=news"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-lg transition-colors"
              >
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
            ? (
              <div className="py-24 text-center">
                <p className="text-sm text-white/20">{t('board.empty')}</p>
              </div>
            )
            : posts.map(post => (
              compact
                ? <CompactPost key={post.id} post={post} token={token} onVote={handleVote} t={t} showType={false} />
                : <CardPost    key={post.id} post={post} token={token} onVote={handleVote} t={t} showType={false} />
            ))
          }
        </div>

        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </main>
    </div>
  )
}
