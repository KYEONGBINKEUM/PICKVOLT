'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, PenSquare, ThumbsUp, ChevronLeft, Pin } from 'lucide-react'
import Navbar from '@/components/Navbar'

interface Post {
  id: string; title: string; body: string; upvotes: number; comment_count: number
  created_at: string; user_display_name: string; is_pinned: boolean
  community_post_products: { products: { id: string; name: string } | null }[]
}

const SORTS = [{ key: 'latest', label: '최신' }, { key: 'hot', label: '인기' }, { key: 'top', label: '댓글 많은' }]

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금 전'
  if (s < 3600) return `${Math.floor(s/60)}분 전`
  if (s < 86400) return `${Math.floor(s/3600)}시간 전`
  return `${Math.floor(s/86400)}일 전`
}

export default function ForumPage() {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('latest')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/community/posts?type=forum&sort=${sort}&page=${page}&limit=20`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [sort, page])

  useEffect(() => { setPage(1) }, [sort])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/community" className="text-white/30 hover:text-white/60 transition-colors"><ChevronLeft className="w-5 h-5" /></Link>
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-black text-white">포럼</h1>
          <div className="ml-auto">
            <Link href="/community/write?type=forum" className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <PenSquare className="w-3.5 h-3.5" /> 글 작성
            </Link>
          </div>
        </div>

        <div className="flex gap-1.5 mb-4">
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sort === s.key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-white/20 mb-4">아직 게시물이 없어요</p>
              <Link href="/community/write?type=forum" className="text-xs text-accent hover:underline">첫 글을 작성해보세요</Link>
            </div>
          ) : (
            posts.map(post => (
              <Link key={post.id} href={`/community/posts/${post.id}`}
                className="group block border-b border-border last:border-0 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {post.is_pinned && <Pin className="w-3 h-3 text-accent flex-shrink-0" />}
                      {post.community_post_products?.length > 0 && (
                        <span className="text-[10px] text-purple-400/70 truncate max-w-[200px]">
                          📦 {post.community_post_products[0].products?.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors line-clamp-2">{post.title}</p>
                    <p className="text-xs text-white/35 mt-1 line-clamp-1">{post.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-white/25">
                      <span>{post.user_display_name}</span>
                      <span>{timeAgo(post.created_at)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.upvotes}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/40 hover:text-white disabled:opacity-30">이전</button>
            <span className="px-3 py-1.5 text-xs text-white/40">{page} / {Math.ceil(total/20)}</span>
            <button disabled={page >= Math.ceil(total/20)} onClick={() => setPage(p => p+1)} className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/40 hover:text-white disabled:opacity-30">다음</button>
          </div>
        )}
      </main>
    </div>
  )
}
