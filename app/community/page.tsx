'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, Star, GitCompare, ChevronRight, TrendingUp, PenSquare, ThumbsUp } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

interface PostSummary {
  id: string
  type: string
  category: string | null
  title: string
  upvotes: number
  comment_count: number
  rating: number | null
  created_at: string
  user_display_name: string
  user_avatar_url: string | null
  community_compare_options?: { label: string; vote_count: number }[]
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금 전'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

const CATEGORY_LABEL: Record<string, string> = { laptop: '랩탑', mobile: '모바일', tablet: '태블릿', other: '기타' }
const TYPE_COLOR: Record<string, string> = {
  review:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  forum:   'bg-purple-500/15 text-purple-400 border-purple-500/20',
  compare: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}
const TYPE_LABEL: Record<string, string> = { review: '리뷰', forum: '포럼', compare: '투표' }

function PostRow({ post }: { post: PostSummary }) {
  const totalVotes = post.community_compare_options?.reduce((s, o) => s + o.vote_count, 0) ?? 0
  return (
    <Link href={`/community/posts/${post.id}`} className="group flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLOR[post.type] ?? ''}`}>{TYPE_LABEL[post.type]}</span>
          {post.category && <span className="text-[10px] text-white/30">{CATEGORY_LABEL[post.category]}</span>}
          {post.rating != null && <span className="text-[10px] text-accent font-bold">★ {post.rating}</span>}
          {post.type === 'compare' && totalVotes > 0 && <span className="text-[10px] text-white/30">{totalVotes}표</span>}
        </div>
        <p className="text-sm font-semibold text-white/80 group-hover:text-white line-clamp-2 transition-colors">{post.title}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/30">
          <span>{post.user_display_name}</span>
          <span>{timeAgo(post.created_at)}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.upvotes}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
        </div>
      </div>
    </Link>
  )
}

export default function CommunityPage() {
  const [reviews, setReviews]   = useState<PostSummary[]>([])
  const [forums, setForums]     = useState<PostSummary[]>([])
  const [compares, setCompares] = useState<PostSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [token, setToken]       = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null))
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/community/posts?type=review&limit=5&sort=latest').then(r => r.json()),
      fetch('/api/community/posts?type=forum&limit=5&sort=latest').then(r => r.json()),
      fetch('/api/community/posts?type=compare&limit=5&sort=hot').then(r => r.json()),
    ]).then(([r, f, c]) => {
      setReviews(r.posts ?? [])
      setForums(f.posts ?? [])
      setCompares(c.posts ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined
  void authHeader

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">커뮤니티</h1>
            <p className="text-sm text-white/40 mt-1">유저 리뷰, 토론, 제품 비교투표</p>
          </div>
          <Link href="/community/write" className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <PenSquare className="w-4 h-4" />
            글 작성
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 리뷰 */}
            <section className="bg-surface border border-border rounded-2xl overflow-hidden lg:col-span-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">리뷰</span>
                </div>
                <Link href="/community/reviews" className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                  더보기 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {reviews.length === 0
                ? <p className="text-xs text-white/20 text-center py-8">아직 리뷰가 없어요</p>
                : reviews.map(p => <PostRow key={p.id} post={p} />)}
            </section>

            {/* 포럼 */}
            <section className="bg-surface border border-border rounded-2xl overflow-hidden lg:col-span-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold text-white">포럼</span>
                </div>
                <Link href="/community/forum" className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                  더보기 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {forums.length === 0
                ? <p className="text-xs text-white/20 text-center py-8">아직 글이 없어요</p>
                : forums.map(p => <PostRow key={p.id} post={p} />)}
            </section>

            {/* 비교투표 */}
            <section className="bg-surface border border-border rounded-2xl overflow-hidden lg:col-span-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">비교투표</span>
                </div>
                <Link href="/community/compare" className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                  더보기 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {compares.length === 0
                ? <p className="text-xs text-white/20 text-center py-8">아직 투표가 없어요</p>
                : compares.map(p => <PostRow key={p.id} post={p} />)}
            </section>
          </div>
        )}

        {/* 인기 글 */}
        <section className="mt-6 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-white">인기 글</span>
          </div>
          <HotPosts />
        </section>
      </main>
    </div>
  )
}

function HotPosts() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  useEffect(() => {
    fetch('/api/community/posts?sort=hot&limit=10')
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
  }, [])
  if (posts.length === 0) return <p className="text-xs text-white/20 text-center py-6">아직 게시물이 없어요</p>
  return <div>{posts.map(p => <PostRow key={p.id} post={p} />)}</div>
}
