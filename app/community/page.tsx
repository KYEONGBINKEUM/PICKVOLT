'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronUp, MessageSquare, Eye, Flame, Clock, BarChart2 } from 'lucide-react'
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
  my_vote: boolean
}

const TYPE_LABEL: Record<string, string> = {
  forum: '포럼', review: '리뷰', compare: '비교투표',
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

function PostRow({ post, token, onVote }: {
  post: Post
  token: string | null
  onVote: (id: string) => void
}) {
  return (
    <div className="flex group">
      {/* 업보트 */}
      <div className="flex flex-col items-center pt-2 px-2 w-10 flex-shrink-0">
        <button
          onClick={e => { e.preventDefault(); if (token) onVote(post.id) }}
          className={`p-0.5 transition-colors ${post.my_vote ? 'text-accent' : 'text-white/20 hover:text-accent'}`}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <span className={`text-[11px] font-bold tabular-nums ${post.my_vote ? 'text-accent' : 'text-white/25'}`}>
          {post.upvotes}
        </span>
      </div>

      {/* 콘텐츠 */}
      <Link href={`/community/posts/${post.id}`} className="flex-1 py-2.5 pr-3 min-w-0">
        {/* 메타 */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-medium text-white/30">{TYPE_LABEL[post.type]}</span>
          <span className="text-white/15 text-[10px]">·</span>
          <span className="text-[10px] text-white/25">{post.user_display_name}</span>
          <span className="text-white/15 text-[10px]">·</span>
          <span className="text-[10px] text-white/20">{timeAgo(post.created_at)}</span>
          {post.rating != null && (
            <>
              <span className="text-white/15 text-[10px]">·</span>
              <span className="text-[10px] font-bold text-amber-400">{post.rating}/10</span>
            </>
          )}
        </div>

        {/* 제목 */}
        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-1.5">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-1.5 text-xs text-accent font-semibold">[{post.comment_count}]</span>
          )}
        </p>

        {/* 본문 미리보기 */}
        {post.body && !/<[a-z]/i.test(post.body) && (
          <p className="text-xs text-white/25 line-clamp-1 mb-1.5 leading-relaxed">{post.body}</p>
        )}

        {/* 하단 메타 */}
        <div className="flex items-center gap-3 text-[11px] text-white/20">
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}개 댓글</span>
          {post.view_count > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>}
        </div>
      </Link>
    </div>
  )
}

function PostSkeleton() {
  return (
    <div className="flex animate-pulse py-2">
      <div className="w-10 flex-shrink-0 flex flex-col items-center pt-2 gap-1">
        <div className="w-5 h-5 bg-white/5 rounded" />
        <div className="w-4 h-2.5 bg-white/5 rounded" />
      </div>
      <div className="flex-1 py-0.5 space-y-2">
        <div className="h-2 w-32 bg-white/5 rounded" />
        <div className="h-3.5 w-3/4 bg-white/5 rounded" />
        <div className="h-2.5 w-full bg-white/5 rounded" />
        <div className="h-2 w-24 bg-white/5 rounded" />
      </div>
    </div>
  )
}

const TYPE_TABS = [
  { key: '',        label: '전체' },
  { key: 'forum',   label: '포럼' },
  { key: 'review',  label: '리뷰' },
  { key: 'compare', label: '비교투표' },
]
const SORT_TABS = [
  { key: 'hot',    label: '인기',   icon: Flame },
  { key: 'latest', label: '최신',   icon: Clock },
  { key: 'top',    label: '댓글순', icon: BarChart2 },
]

export default function CommunityPage() {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType]       = useState('')
  const [sort, setSort]       = useState('hot')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [token, setToken]     = useState<string | null>(null)

  const LIMIT = 25

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
    const end   = Math.min(totalPages, start + 6)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[740px] mx-auto px-4 pt-24 pb-20">

        {/* 정렬 탭 */}
        <div className="flex items-center gap-1 mb-1 border-b border-border/50">
          {TYPE_TABS.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
                type === t.key ? 'border-accent text-white' : 'border-transparent text-white/30 hover:text-white/60'
              }`}>
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-0.5 mb-1">
            {SORT_TABS.map(s => {
              const Icon = s.icon
              return (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    sort === s.key ? 'bg-white/8 text-white' : 'text-white/25 hover:text-white/60'
                  }`}>
                  <Icon className="w-3 h-3" />{s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 게시물 목록 */}
        <div className="divide-y divide-border/40">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <PostSkeleton key={i} />)
            : posts.length === 0
            ? (
              <div className="py-24 text-center">
                <p className="text-sm text-white/20">게시물이 없습니다</p>
              </div>
            )
            : posts.map(post => (
              <PostRow key={post.id} post={post} token={token} onVote={handleVote} />
            ))
          }
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-8">
            <button disabled={page === 1} onClick={() => setPage(1)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">‹</button>
            {pageNumbers().map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  p === page ? 'bg-accent border-accent text-white' : 'bg-surface border-border text-white/30 hover:text-white'
                }`}>{p}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/30 hover:text-white disabled:opacity-20 transition-colors">»</button>
          </div>
        )}
      </div>
    </div>
  )
}
