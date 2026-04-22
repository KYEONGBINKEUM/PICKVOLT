'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronUp, MessageSquare, Eye, Flame, Clock, BarChart2, LayoutList, LayoutGrid } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

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

const TYPE_COLOR: Record<string, string> = {
  forum:   'text-blue-400',
  review:  'text-amber-400',
  compare: 'text-purple-400',
}

function timeAgo(d: string, t: (k: string) => string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return t('time.just')
  if (s < 3600) return `${Math.floor(s / 60)}${t('time.min')}`
  if (s < 86400) return `${Math.floor(s / 3600)}${t('time.hour')}`
  return `${Math.floor(s / 86400)}${t('time.day')}`
}

/* ── Compact row ── */
function CompactRow({ post, token, onVote, t }: {
  post: Post; token: string | null
  onVote: (id: string) => void
  t: (k: string) => string
}) {
  const typeLabel = t(`community.${post.type}`)
  const color = TYPE_COLOR[post.type] ?? 'text-white/30'
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/[0.03] rounded-lg group transition-colors">
      {/* upvote */}
      <div className="flex items-center gap-0.5 flex-shrink-0 w-12">
        <button
          onClick={e => { e.preventDefault(); if (token) onVote(post.id) }}
          className={`p-0.5 transition-colors ${post.my_vote ? 'text-accent' : 'text-white/20 hover:text-accent'}`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <span className={`text-[11px] font-bold tabular-nums ${post.my_vote ? 'text-accent' : 'text-white/25'}`}>
          {post.upvotes}
        </span>
      </div>

      {/* type badge */}
      <span className={`text-[10px] font-semibold flex-shrink-0 w-10 ${color}`}>
        {typeLabel}
      </span>

      {/* title */}
      <Link href={`/community/posts/${post.id}`} className="flex-1 min-w-0">
        <span className="text-sm text-white/75 group-hover:text-white transition-colors leading-snug line-clamp-1">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-1.5 text-[11px] text-accent font-semibold">[{post.comment_count}]</span>
          )}
        </span>
      </Link>

      {/* meta right */}
      <div className="flex items-center gap-3 flex-shrink-0 text-[10px] text-white/20">
        {post.rating != null && <span className="text-amber-400 font-bold">{post.rating}/10</span>}
        <span>{post.user_display_name}</span>
        <span>{timeAgo(post.created_at, t)}</span>
        <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
        {post.view_count > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.view_count}</span>}
      </div>
    </div>
  )
}

/* ── Card row ── */
function CardRow({ post, token, onVote, t }: {
  post: Post; token: string | null
  onVote: (id: string) => void
  t: (k: string) => string
}) {
  const typeLabel = t(`community.${post.type}`)
  const color = TYPE_COLOR[post.type] ?? 'text-white/30'
  return (
    <div className="flex group border-b border-border/40 py-3 px-2 hover:bg-white/[0.02] transition-colors rounded-lg">
      {/* upvote col */}
      <div className="flex flex-col items-center pt-0.5 px-2 w-10 flex-shrink-0">
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

      {/* content */}
      <Link href={`/community/posts/${post.id}`} className="flex-1 min-w-0 pr-2">
        {/* meta top */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[10px] font-semibold ${color}`}>{typeLabel}</span>
          <span className="text-white/15 text-[10px]">·</span>
          <span className="text-[10px] text-white/25">{post.user_display_name}</span>
          <span className="text-white/15 text-[10px]">·</span>
          <span className="text-[10px] text-white/20">{timeAgo(post.created_at, t)}</span>
          {post.rating != null && (
            <>
              <span className="text-white/15 text-[10px]">·</span>
              <span className="text-[10px] font-bold text-amber-400">{post.rating}/10</span>
            </>
          )}
        </div>

        {/* title */}
        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-1.5">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-1.5 text-xs text-accent font-semibold">[{post.comment_count}]</span>
          )}
        </p>

        {/* body preview */}
        {post.body && !/<[a-z]/i.test(post.body) && (
          <p className="text-xs text-white/25 line-clamp-1 mb-1.5 leading-relaxed">{post.body}</p>
        )}

        {/* bottom meta */}
        <div className="flex items-center gap-3 text-[11px] text-white/20">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {post.comment_count} {t('community.comments')}
          </span>
          {post.view_count > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>}
        </div>
      </Link>
    </div>
  )
}

function PostSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 animate-pulse">
        <div className="w-12 h-3 bg-white/5 rounded" />
        <div className="w-10 h-3 bg-white/5 rounded" />
        <div className="flex-1 h-3 bg-white/5 rounded" />
        <div className="w-32 h-3 bg-white/5 rounded" />
      </div>
    )
  }
  return (
    <div className="flex py-3 px-2 animate-pulse border-b border-border/40">
      <div className="w-10 flex-shrink-0 flex flex-col items-center pt-1 gap-1">
        <div className="w-5 h-5 bg-white/5 rounded" />
        <div className="w-4 h-2.5 bg-white/5 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-2 w-32 bg-white/5 rounded" />
        <div className="h-3.5 w-3/4 bg-white/5 rounded" />
        <div className="h-2.5 w-full bg-white/5 rounded" />
        <div className="h-2 w-24 bg-white/5 rounded" />
      </div>
    </div>
  )
}

export default function CommunityPage() {
  const { t } = useI18n()
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('hot')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [token, setToken]     = useState<string | null>(null)
  const [compact, setCompact] = useState(false)

  const LIMIT = 25

  const SORT_TABS = [
    { key: 'hot',    label: t('sort.hot'),    icon: Flame },
    { key: 'latest', label: t('sort.latest'), icon: Clock },
    { key: 'top',    label: t('sort.top'),    icon: BarChart2 },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, page: String(page), limit: String(LIMIT) })
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    fetch(`/api/community/posts?${params}`, { headers })
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [sort, page, token])

  useEffect(() => { setPage(1) }, [sort])
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
      <div className="max-w-[740px] mx-auto px-4 pt-[88px] pb-20">

        {/* 필터 바 */}
        <div className="flex items-center gap-1 mb-2 border-b border-border/50 pb-1">
          <div className="flex items-center gap-0.5">
            {SORT_TABS.map(s => {
              const Icon = s.icon
              return (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sort === s.key ? 'bg-white/8 text-white' : 'text-white/30 hover:text-white/60'
                  }`}>
                  <Icon className="w-3 h-3" />{s.label}
                </button>
              )
            })}
          </div>

          {/* 뷰 토글 */}
          <div className="ml-auto flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setCompact(false)}
              className={`p-1.5 rounded-md transition-colors ${!compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCompact(true)}
              className={`p-1.5 rounded-md transition-colors ${compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 게시물 목록 */}
        <div className={compact ? 'divide-y divide-border/30' : ''}>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)
            : posts.length === 0
            ? (
              <div className="py-24 text-center">
                <p className="text-sm text-white/20">{t('board.empty')}</p>
              </div>
            )
            : posts.map(post => (
              compact
                ? <CompactRow key={post.id} post={post} token={token} onVote={handleVote} t={t} />
                : <CardRow    key={post.id} post={post} token={token} onVote={handleVote} t={t} />
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
