'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Pin, Eye, ThumbsUp, Flame, Clock, BarChart2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n } from '@/lib/i18n'

interface Post {
  id: string; title: string; body: string
  upvotes: number; comment_count: number; view_count: number
  created_at: string; user_display_name: string; is_pinned: boolean
  community_post_products: { products: { id: string; name: string } | null }[]
}

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
  return `${String(dt.getMonth() + 1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

function timeAgo(d: string, t: (k: string) => string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return t('time.just')
  if (s < 3600) return `${Math.floor(s / 60)}${t('time.min')}`
  if (s < 86400) return `${Math.floor(s / 3600)}${t('time.hour')}`
  return `${Math.floor(s / 86400)}${t('time.day')}`
}

export default function ForumPage() {
  const { t } = useI18n()
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('latest')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)

  const LIMIT = 30

  const SORTS = [
    { key: 'latest', label: t('sort.latest'), icon: Clock },
    { key: 'hot',    label: t('sort.hot'),    icon: Flame },
    { key: 'top',    label: t('sort.top'),    icon: BarChart2 },
  ]

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/community/posts?type=forum&sort=${sort}&page=${page}&limit=${LIMIT}`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [sort, page])

  useEffect(() => { setPage(1) }, [sort])
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
          <h1 className="text-lg font-black text-white">{t('community.forum')}</h1>
          {total > 0 && <span className="text-xs text-white/30">{total.toLocaleString()}</span>}
        </div>

        {/* 정렬 탭 */}
        <div className="flex gap-1 mb-0 border-b border-border">
          {SORTS.map(s => {
            const Icon = s.icon
            return (
              <button key={s.key} onClick={() => setSort(s.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
                  sort === s.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-white/35 hover:text-white/60'
                }`}>
                <Icon className="w-3 h-3" /> {s.label}
              </button>
            )
          })}
        </div>

        {/* 테이블 */}
        <div className="bg-surface border border-border border-t-0 rounded-b-xl overflow-hidden">
          {/* 헤더 행 */}
          <div className="hidden sm:grid grid-cols-[3rem_1fr_7rem_5rem_4rem] gap-0 border-b border-border bg-black/20">
            <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">{t('col.num')}</div>
            <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold">{t('col.title')}</div>
            <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">{t('col.author')}</div>
            <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">{t('col.views')}</div>
            <div className="px-3 py-2.5 text-[10px] text-white/30 font-semibold text-center">{t('col.date')}</div>
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
              <p className="text-sm text-white/20 mb-3">{t('board.empty')}</p>
              <Link href="/community/write?type=forum" className="text-xs text-accent hover:underline">
                {t('board.write_first')}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post, idx) => (
                <Link key={post.id} href={`/community/posts/${post.id}`}
                  className="group sm:grid sm:grid-cols-[3rem_1fr_7rem_5rem_4rem] gap-0 flex flex-col px-0 hover:bg-white/[0.02] transition-colors">

                  {/* 번호 */}
                  <div className="hidden sm:flex items-center justify-center px-3 py-3">
                    {post.is_pinned
                      ? <Pin className="w-3 h-3 text-accent" />
                      : <span className="text-[11px] text-white/25 tabular-nums">{total - offset - idx}</span>
                    }
                  </div>

                  {/* 제목 영역 */}
                  <div className="px-3 py-3 sm:py-2.5 flex flex-col justify-center min-w-0">
                    <div className="flex items-start gap-1.5">
                      {post.is_pinned && <Pin className="w-3 h-3 text-accent mt-0.5 flex-shrink-0 sm:hidden" />}
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-1 font-medium">
                          {post.title}
                          {post.comment_count > 0 && (
                            <span className="ml-1.5 text-[10px] text-accent font-bold">
                              [{post.comment_count}]
                            </span>
                          )}
                        </p>
                        {post.community_post_products?.length > 0 && (
                          <span className="text-[10px] text-white/30 truncate block mt-0.5">
                            {post.community_post_products[0].products?.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 모바일 메타 */}
                    <div className="flex items-center gap-2 mt-1 sm:hidden text-[10px] text-white/25">
                      <span>{post.user_display_name}</span>
                      <span>{timeAgo(post.created_at, t)}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="w-2.5 h-2.5" />{post.upvotes}</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{post.view_count}</span>
                    </div>
                  </div>

                  {/* 작성자 */}
                  <div className="hidden sm:flex items-center justify-center px-2 py-2.5">
                    <span className="text-[11px] text-white/40 truncate max-w-full">{post.user_display_name}</span>
                  </div>

                  {/* 조회 */}
                  <div className="hidden sm:flex items-center justify-center px-2 py-2.5 gap-3">
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
                }`}>{p}</button>
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
