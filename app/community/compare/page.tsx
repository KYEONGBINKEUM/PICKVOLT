'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { GitCompare, PenSquare, MessageSquare, ChevronLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'

interface Option { id: string; label: string; vote_count: number; image_url: string | null; product_id: string | null }
interface Post {
  id: string; title: string; upvotes: number; comment_count: number; created_at: string
  user_display_name: string
  community_compare_options: Option[]
  my_compare_option: string | null
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금 전'
  if (s < 3600) return `${Math.floor(s/60)}분 전`
  if (s < 86400) return `${Math.floor(s/3600)}시간 전`
  return `${Math.floor(s/86400)}일 전`
}

function CompareCard({ post }: { post: Post }) {
  const opts = post.community_compare_options
  const total = opts.reduce((s, o) => s + o.vote_count, 0)
  return (
    <Link href={`/community/posts/${post.id}`} className="group block bg-surface border border-border rounded-2xl p-4 hover:border-white/15 transition-all">
      <p className="text-sm font-bold text-white/80 group-hover:text-white mb-3 transition-colors line-clamp-2">{post.title}</p>
      {opts.length >= 2 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {opts.slice(0, 2).map(opt => {
            const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
            const isChosen = post.my_compare_option === opt.id
            return (
              <div key={opt.id} className={`relative rounded-xl border p-3 overflow-hidden transition-all ${isChosen ? 'border-accent/60 bg-accent/5' : 'border-border bg-surface-2'}`}>
                <div className="absolute inset-0 bg-accent/10 transition-all" style={{ width: `${pct}%` }} />
                <p className="relative text-xs font-semibold text-white/70 truncate mb-1">{opt.label}</p>
                <p className="relative text-lg font-black text-white">{pct}<span className="text-xs text-white/30 font-normal">%</span></p>
                <p className="relative text-[10px] text-white/30">{opt.vote_count}표</p>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex items-center gap-3 text-[11px] text-white/25">
        <span>{post.user_display_name}</span>
        <span>{timeAgo(post.created_at)}</span>
        <span>{total}명 참여</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
      </div>
    </Link>
  )
}

export default function ComparePage() {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('hot')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/community/posts?type=compare&sort=${sort}&page=${page}&limit=12`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [sort, page])

  useEffect(() => { setPage(1) }, [sort])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/community" className="text-white/30 hover:text-white/60 transition-colors"><ChevronLeft className="w-5 h-5" /></Link>
          <GitCompare className="w-5 h-5 text-orange-400" />
          <h1 className="text-xl font-black text-white">비교투표</h1>
          <div className="ml-auto">
            <Link href="/community/write?type=compare" className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <PenSquare className="w-3.5 h-3.5" /> 투표 만들기
            </Link>
          </div>
        </div>

        <div className="flex gap-1.5 mb-4">
          {[{key:'hot',label:'인기'},{key:'latest',label:'최신'}].map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sort === s.key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-white/20 mb-4">아직 투표가 없어요</p>
            <Link href="/community/write?type=compare" className="text-xs text-accent hover:underline">첫 투표를 만들어보세요</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map(post => <CompareCard key={post.id} post={post} />)}
          </div>
        )}

        {total > 12 && (
          <div className="flex justify-center gap-2 mt-6">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/40 hover:text-white disabled:opacity-30">이전</button>
            <span className="px-3 py-1.5 text-xs text-white/40">{page} / {Math.ceil(total/12)}</span>
            <button disabled={page >= Math.ceil(total/12)} onClick={() => setPage(p => p+1)} className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/40 hover:text-white disabled:opacity-30">다음</button>
          </div>
        )}
      </main>
    </div>
  )
}
