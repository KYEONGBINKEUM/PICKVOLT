'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronUp, MessageSquare, PenSquare, TrendingUp,
  Star, GitCompare, Eye, Flame, Clock, BarChart2
} from 'lucide-react'
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

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  review:  { label: '리뷰',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  forum:   { label: '포럼',    cls: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  compare: { label: '비교투표', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
}
const CAT: Record<string, string> = { laptop: '랩탑', mobile: '모바일', tablet: '태블릿', other: '기타' }

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금 전'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

function PostCard({ post, token, onVote }: { post: Post; token: string | null; onVote: (id: string) => void }) {
  const badge = TYPE_BADGE[post.type]
  const totalVotes = post.community_compare_options?.reduce((s, o) => s + o.vote_count, 0) ?? 0

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden hover:border-white/15 transition-all group flex">
      {/* 업보트 컬럼 */}
      <div className="flex flex-col items-center gap-1 px-2.5 py-4 bg-black/20 border-r border-border min-w-[48px]">
        <button
          onClick={e => { e.preventDefault(); if (token) onVote(post.id) }}
          title={token ? undefined : '로그인 후 투표 가능'}
          className={`p-1 rounded-lg transition-colors ${
            post.my_vote
              ? 'text-accent bg-accent/10'
              : 'text-white/25 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <span className={`text-xs font-black tabular-nums ${post.my_vote ? 'text-accent' : 'text-white/50'}`}>
          {post.upvotes}
        </span>
      </div>

      {/* 본문 */}
      <Link href={`/community/posts/${post.id}`} className="flex-1 p-3.5 min-w-0">
        {/* 뱃지 */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
          {post.category && <span className="text-[10px] text-white/30">{CAT[post.category]}</span>}
          {post.rating != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
              <Star className="w-2.5 h-2.5 fill-amber-400" /> {post.rating}/10
            </span>
          )}
          {post.type === 'compare' && totalVotes > 0 && (
            <span className="text-[10px] text-white/30">{totalVotes}표</span>
          )}
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors leading-snug mb-1">
          {post.title}
        </h3>

        {/* 본문 미리보기 */}
        {post.body && (
          <p className="text-xs text-white/35 leading-relaxed line-clamp-2 mb-2">{post.body}</p>
        )}

        {/* 메타 */}
        <div className="flex items-center gap-3 text-[11px] text-white/25">
          {post.user_avatar_url ? (
            <div className="w-4 h-4 rounded-full overflow-hidden relative flex-shrink-0">
              <Image src={post.user_avatar_url} alt={post.user_display_name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] text-white/40">{post.user_display_name[0]?.toUpperCase()}</span>
            </div>
          )}
          <span className="text-white/40 font-medium">{post.user_display_name}</span>
          <span>{timeAgo(post.created_at)}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
          {post.view_count > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>}
        </div>
      </Link>
    </div>
  )
}

function PostCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex animate-pulse">
      <div className="w-12 bg-black/20 border-r border-border" />
      <div className="flex-1 p-3.5 space-y-2">
        <div className="h-3 w-16 bg-white/5 rounded" />
        <div className="h-4 w-3/4 bg-white/5 rounded" />
        <div className="h-3 w-full bg-white/5 rounded" />
        <div className="h-3 w-1/2 bg-white/5 rounded" />
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
  { key: 'top', label: '댓글많은', icon: BarChart2 },
]

export default function CommunityPage() {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType]       = useState('')
  const [sort, setSort]       = useState('hot')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [token, setToken]     = useState<string | null>(null)
  const [hotPosts, setHotPosts] = useState<Post[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, page: String(page), limit: '20' })
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

  const totalPages = Math.ceil(total / 20)

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
      <main className="max-w-[1080px] mx-auto px-4 py-6">
        <div className="flex gap-5">
          {/* ── 메인 피드 ── */}
          <div className="flex-1 min-w-0">

            {/* 타입 탭 */}
            <div className="flex items-center gap-0.5 bg-surface border border-border rounded-xl p-1 mb-3">
              {TYPE_TABS.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    type === t.key ? 'bg-white/10 text-white shadow-sm' : 'text-white/35 hover:text-white/60'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* 정렬 + 글쓰기 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {SORT_TABS.map(s => {
                  const Icon = s.icon
                  return (
                    <button key={s.key} onClick={() => setSort(s.key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        sort === s.key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                      }`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </button>
                  )
                })}
              </div>
              <Link href="/community/write"
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors">
                <PenSquare className="w-3.5 h-3.5" /> 글 작성
              </Link>
            </div>

            {/* 게시물 목록 */}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 bg-surface border border-border rounded-xl">
                <p className="text-sm text-white/20 mb-3">아직 게시물이 없어요</p>
                <Link href="/community/write" className="text-xs text-accent hover:underline">첫 글을 작성해보세요</Link>
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
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/40 hover:text-white disabled:opacity-30 transition-colors">
                  이전
                </button>
                {pageNumbers().map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      p === page ? 'bg-accent border-accent text-white' : 'bg-surface border-border text-white/40 hover:text-white'
                    }`}>
                    {p}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/40 hover:text-white disabled:opacity-30 transition-colors">
                  다음
                </button>
              </div>
            )}
          </div>

          {/* ── 사이드바 ── */}
          <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-4">

            {/* 커뮤니티 소개 + 글쓰기 */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm font-bold text-white mb-2">픽볼트 커뮤니티</p>
              <p className="text-xs text-white/35 leading-relaxed mb-3">
                제품 리뷰, 정보 공유, 비교 투표를 자유롭게 해보세요.
              </p>
              <div className="space-y-1.5">
                <Link href="/community/write?type=forum"
                  className="flex items-center gap-2 w-full py-2 px-3 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold rounded-lg hover:bg-accent/15 transition-colors">
                  <PenSquare className="w-3.5 h-3.5" /> 포럼 글 쓰기
                </Link>
                <Link href="/community/write?type=review"
                  className="flex items-center gap-2 w-full py-2 px-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg hover:bg-blue-500/15 transition-colors">
                  <Star className="w-3.5 h-3.5" /> 리뷰 작성
                </Link>
                <Link href="/community/write?type=compare"
                  className="flex items-center gap-2 w-full py-2 px-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold rounded-lg hover:bg-orange-500/15 transition-colors">
                  <GitCompare className="w-3.5 h-3.5" /> 비교투표 만들기
                </Link>
              </div>
            </div>

            {/* 게시판 이동 */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">게시판</p>
              <div className="space-y-0.5">
                {[
                  { href: '/community', label: '전체 피드', emoji: '🏠', active: !type },
                  { href: '/community/forum', label: '포럼 게시판', emoji: '💬' },
                  { href: '/community/reviews', label: '리뷰 게시판', emoji: '⭐' },
                  { href: '/community/compare', label: '비교투표', emoji: '⚖️' },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/5 transition-colors">
                    <span className="text-sm">{item.emoji}</span> {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 인기 게시물 */}
            {hotPosts.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" />
                  <p className="text-xs font-bold text-white">인기 게시물</p>
                </div>
                <div className="space-y-2.5">
                  {hotPosts.map((p, i) => (
                    <Link key={p.id} href={`/community/posts/${p.id}`}
                      className="flex items-start gap-2 group">
                      <span className="text-[11px] font-black text-white/20 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-white/45 group-hover:text-white/80 transition-colors line-clamp-2 flex-1 leading-relaxed">
                        {p.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
