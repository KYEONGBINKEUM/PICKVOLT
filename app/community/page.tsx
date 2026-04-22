'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronUp, MessageSquare, Eye, Flame, Clock, BarChart2, PenSquare, TrendingUp } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

interface Post {
  id: string
  type: 'review' | 'forum' | 'compare'
  category: string | null
  title: string
  body: string
  upvotes: number
  comment_count: number
  view_count: number
  rating: number | null
  created_at: string
  user_display_name: string
  user_avatar_url: string | null
  my_vote: boolean
  community_compare_options?: { label: string; vote_count: number }[]
}

const TYPE_LABEL: Record<string, string> = {
  review: '리뷰', forum: '포럼', compare: '비교투표',
}
const CAT_LABEL: Record<string, string> = {
  laptop: '랩탑', mobile: '모바일', tablet: '태블릿', other: '기타',
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

function PostCard({ post, token, onVote }: {
  post: Post
  token: string | null
  onVote: (id: string) => void
}) {
  return (
    <div className="flex bg-surface border border-border rounded-xl overflow-hidden hover:border-white/10 transition-colors">
      {/* 업보트 */}
      <div className="flex flex-col items-center gap-1 px-3 py-4 border-r border-border w-12 flex-shrink-0">
        <button
          onClick={e => { e.preventDefault(); if (token) onVote(post.id) }}
          className={`p-0.5 rounded transition-colors ${
            post.my_vote ? 'text-accent' : 'text-white/20 hover:text-white/60'
          }`}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <span className={`text-[11px] font-bold tabular-nums ${post.my_vote ? 'text-accent' : 'text-white/30'}`}>
          {post.upvotes}
        </span>
      </div>

      {/* 콘텐츠 */}
      <Link href={`/community/posts/${post.id}`} className="flex-1 px-4 py-3.5 min-w-0 block">
        {/* 메타 상단 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide">
            {TYPE_LABEL[post.type]}
          </span>
          {post.category && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/25">{CAT_LABEL[post.category]}</span>
            </>
          )}
          {post.rating != null && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] font-bold text-amber-400">{post.rating}/10</span>
            </>
          )}
          <span className="text-white/15">·</span>
          <span className="text-[10px] text-white/25">{timeAgo(post.created_at)}</span>
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-semibold text-white/80 hover:text-white transition-colors leading-snug mb-1.5 line-clamp-2">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-1.5 text-[10px] text-accent font-bold">[{post.comment_count}]</span>
          )}
        </h3>

        {/* 본문 미리보기 */}
        {post.body && (
          <p className="text-xs text-white/30 leading-relaxed line-clamp-2 mb-2.5">
            {post.body}
          </p>
        )}

        {/* 메타 하단 */}
        <div className="flex items-center gap-3 text-[11px] text-white/25">
          <div className="flex items-center gap-1.5">
            {post.user_avatar_url ? (
              <div className="w-3.5 h-3.5 rounded-full overflow-hidden relative flex-shrink-0">
                <Image src={post.user_avatar_url} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex-shrink-0" />
            )}
            <span className="text-white/35">{post.user_display_name}</span>
          </div>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {post.comment_count}
          </span>
          {post.view_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {post.view_count}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

function PostSkeleton() {
  return (
    <div className="flex bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="w-12 border-r border-border flex-shrink-0" />
      <div className="flex-1 px-4 py-3.5 space-y-2">
        <div className="h-2.5 w-24 bg-white/5 rounded" />
        <div className="h-4 w-2/3 bg-white/5 rounded" />
        <div className="h-3 w-full bg-white/5 rounded" />
        <div className="h-2.5 w-1/3 bg-white/5 rounded" />
      </div>
    </div>
  )
}

const TYPE_TABS = [
  { key: '', label: '전체' },
  { key: 'forum', label: '포럼' },
  { key: 'review', label: '리뷰' },
  { key: 'compare', label: '비교투표' },
]
const SORT_TABS = [
  { key: 'hot', label: '인기', icon: Flame },
  { key: 'latest', label: '최신', icon: Clock },
  { key: 'top', label: '댓글순', icon: BarChart2 },
]
const BOARDS = [
  { href: '/community', label: '전체 피드' },
  { href: '/community/forum', label: '포럼' },
  { href: '/community/reviews', label: '리뷰' },
  { href: '/community/compare', label: '비교투표' },
]

export default function CommunityPage() {
  const [posts, setPosts]       = useState<Post[]>([])
  const [loading, setLoading]   = useState(true)
  const [type, setType]         = useState('')
  const [sort, setSort]         = useState('hot')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [token, setToken]       = useState<string | null>(null)
  const [hotPosts, setHotPosts] = useState<Post[]>([])

  const LIMIT = 20

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, page: String(page), limit: String(LIMIT) })
    if (type) params.set('type', type)
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    fetch(`/api/community/posts?${params}`, { headers })
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [sort, page, type, token])

  useEffect(() => { setPage(1) }, [type, sort])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/community/posts?sort=hot&limit=8')
      .then(r => r.json())
      .then(d => setHotPosts(d.posts ?? []))
  }, [])

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
  const pageNumbers = () => {
    const pages: number[] = []
    const start = Math.max(1, page - 3)
    const end = Math.min(totalPages, start + 6)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-inner mx-auto px-6 pt-24 pb-20">
        <div className="flex gap-8">

          {/* ── 피드 ── */}
          <div className="flex-1 min-w-0">

            {/* 타입 탭 */}
            <div className="flex items-center border-b border-border mb-4">
              {TYPE_TABS.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
                    type === t.key
                      ? 'border-accent text-white'
                      : 'border-transparent text-white/30 hover:text-white/60'
                  }`}>
                  {t.label}
                </button>
              ))}
              <div className="ml-auto flex gap-1 pb-1">
                {SORT_TABS.map(s => {
                  const Icon = s.icon
                  return (
                    <button key={s.key} onClick={() => setSort(s.key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        sort === s.key ? 'bg-white/8 text-white' : 'text-white/25 hover:text-white/55'
                      }`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 게시물 목록 */}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <PostSkeleton key={i} />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-24 border border-border rounded-xl bg-surface">
                <p className="text-sm text-white/20 mb-2">게시물이 없습니다</p>
                <Link href="/community/write" className="text-xs text-accent/70 hover:text-accent transition-colors">
                  첫 글을 작성해보세요
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} token={token} onVote={handleVote} />
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-1 mt-6">
                <button disabled={page === 1} onClick={() => setPage(1)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">«</button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">‹</button>
                {pageNumbers().map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      p === page ? 'bg-accent border-accent text-white' : 'bg-surface border-border text-white/30 hover:text-white'
                    }`}>
                    {p}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">›</button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">»</button>
              </div>
            )}
          </div>

          {/* ── 사이드바 ── */}
          <aside className="w-56 flex-shrink-0 hidden lg:flex flex-col gap-3">

            {/* 글쓰기 */}
            <Link href="/community/write"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-xl transition-colors">
              <PenSquare className="w-4 h-4" /> 글 작성
            </Link>

            {/* 게시판 */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">게시판</p>
              <div className="space-y-0.5">
                {BOARDS.map(b => (
                  <Link key={b.href} href={b.href}
                    className="block px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 인기 게시물 */}
            {hotPosts.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp className="w-3 h-3 text-white/30" />
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">인기 게시물</p>
                </div>
                <div className="space-y-2.5">
                  {hotPosts.slice(0, 6).map((p, i) => (
                    <Link key={p.id} href={`/community/posts/${p.id}`}
                      className="flex items-start gap-2 group">
                      <span className="text-[10px] font-bold text-white/15 w-3 flex-shrink-0 mt-0.5 tabular-nums">{i + 1}</span>
                      <p className="text-[11px] text-white/40 group-hover:text-white/70 transition-colors line-clamp-2 leading-relaxed flex-1">
                        {p.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
