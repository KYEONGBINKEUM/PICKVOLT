'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Star, Eye, Flame, Clock } from 'lucide-react'
import Navbar from '@/components/Navbar'

interface Post {
  id: string; category: string | null; title: string; body: string
  upvotes: number; comment_count: number; view_count: number
  rating: number | null; created_at: string
  user_display_name: string
  community_post_products: { products: { name: string } | null }[]
}

const CATEGORIES = [
  { key: '', label: '전체' },
  { key: 'laptop',  label: '랩탑' },
  { key: 'mobile',  label: '모바일' },
  { key: 'tablet',  label: '태블릿' },
  { key: 'other',   label: '기타' },
]
const SORTS = [
  { key: 'latest', label: '최신', icon: Clock },
  { key: 'hot',    label: '인기', icon: Flame },
]

function formatDate(d: string) {
  const dt = new Date(d)
  const now = new Date()
  if (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  ) {
    return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }
  return `${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

function RatingBadge({ r }: { r: number }) {
  const cls = r >= 8 ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : r >= 5 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${cls} flex items-center gap-0.5`}>
      <Star className="w-3 h-3 fill-current" /> {r}
    </span>
  )
}

export default function ReviewsPage() {
  const [posts, setPosts]       = useState<Post[]>([])
  const [loading, setLoading]   = useState(true)
  const [category, setCategory] = useState('')
  const [sort, setSort]         = useState('latest')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)

  const LIMIT = 30

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: 'review', sort, page: String(page), limit: String(LIMIT) })
    if (category) params.set('category', category)
    fetch(`/api/community/posts?${params}`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [category, sort, page])

  useEffect(() => { setPage(1) }, [category, sort])
  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / LIMIT)
  const offset = (page - 1) * LIMIT

  const pageNumbers = () => {
    const pages: number[] = []
    const start = Math.max(1, page - 4)
    const end = Math.min(totalPages, start + 8)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[740px] mx-auto px-4 pt-[88px] pb-20">

          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-blue-400" />
            <h1 className="text-lg font-black text-white">리뷰</h1>
            <span className="text-xs text-white/30">{total > 0 ? `${total.toLocaleString()}개` : ''}</span>
          </div>

            {/* 카테고리 + 정렬 탭 */}
            <div className="flex items-center gap-1 mb-0 border-b border-border">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
                    category === c.key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-white/35 hover:text-white/60'
                  }`}>
                  {c.label}
                </button>
              ))}
              <div className="ml-auto flex gap-1 pr-1">
                {SORTS.map(s => {
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
            </div>

            {/* 테이블 */}
            <div className="bg-surface border border-border border-t-0 rounded-b-xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[3rem_1fr_5rem_7rem_5rem_4rem] gap-0 border-b border-border bg-black/20">
                <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">번호</div>
                <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold">제목</div>
                <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">평점</div>
                <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">작성자</div>
                <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">조회</div>
                <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">날짜</div>
              </div>

              {loading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-3 py-3 flex gap-3 animate-pulse">
                      <div className="h-3 w-6 bg-white/5 rounded" />
                      <div className="h-3 flex-1 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-white/20 mb-3">아직 리뷰가 없어요</p>
                  <Link href="/community/write?type=review" className="text-xs text-accent hover:underline">
                    첫 리뷰를 작성해보세요
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {posts.map((post, idx) => (
                    <Link key={post.id} href={`/community/posts/${post.id}`}
                      className="group sm:grid sm:grid-cols-[3rem_1fr_5rem_7rem_5rem_4rem] flex flex-col hover:bg-white/[0.02] transition-colors">

                      {/* 번호 */}
                      <div className="hidden sm:flex items-center justify-center px-3 py-3">
                        <span className="text-[11px] text-white/25 tabular-nums">{total - offset - idx}</span>
                      </div>

                      {/* 제목 */}
                      <div className="px-3 py-3 sm:py-2.5 flex flex-col justify-center min-w-0">
                        <div className="flex items-start gap-1.5">
                          {post.category && (
                            <span className="text-[9px] font-bold bg-white/8 text-white/40 px-1 py-0.5 rounded mt-0.5 flex-shrink-0">
                              {CATEGORIES.find(c => c.key === post.category)?.label}
                            </span>
                          )}
                          <p className="text-sm text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-1 font-medium">
                            {post.title}
                            {post.comment_count > 0 && (
                              <span className="ml-1.5 text-[10px] text-accent font-bold">[{post.comment_count}]</span>
                            )}
                          </p>
                        </div>
                        {post.community_post_products?.length > 0 && (
                          <span className="text-[10px] text-blue-400/60 mt-0.5 truncate">
                            📦 {post.community_post_products[0].products?.name}
                          </span>
                        )}
                        {/* 모바일 메타 */}
                        <div className="flex items-center gap-2 mt-1 sm:hidden text-[10px] text-white/25">
                          <span>{post.user_display_name}</span>
                          {post.rating != null && <RatingBadge r={post.rating} />}
                          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{post.view_count}</span>
                        </div>
                      </div>

                      {/* 평점 */}
                      <div className="hidden sm:flex items-center justify-center px-2 py-2.5">
                        {post.rating != null ? <RatingBadge r={post.rating} /> : <span className="text-[11px] text-white/15">-</span>}
                      </div>

                      {/* 작성자 */}
                      <div className="hidden sm:flex items-center justify-center px-2 py-2.5">
                        <span className="text-[11px] text-white/40 truncate max-w-full">{post.user_display_name}</span>
                      </div>

                      {/* 조회 */}
                      <div className="hidden sm:flex items-center justify-center px-2 py-2.5">
                        <span className="flex items-center gap-1 text-[11px] text-white/30">
                          <Eye className="w-3 h-3" />{post.view_count}
                        </span>
                      </div>

                      {/* 날짜 */}
                      <div className="hidden sm:flex items-center justify-center px-2 py-2.5">
                        <span className="text-[11px] text-white/30 tabular-nums">{formatDate(post.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-1 mt-5">
                <button disabled={page === 1} onClick={() => setPage(1)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/35 hover:text-white disabled:opacity-30 transition-colors">«</button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/35 hover:text-white disabled:opacity-30 transition-colors">‹</button>
                {pageNumbers().map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      p === page ? 'bg-accent border-accent text-white' : 'bg-surface border-border text-white/35 hover:text-white'
                    }`}>
                    {p}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/35 hover:text-white disabled:opacity-30 transition-colors">›</button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                  className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/35 hover:text-white disabled:opacity-30 transition-colors">»</button>
              </div>
            )}
      </main>
    </div>
  )
}
