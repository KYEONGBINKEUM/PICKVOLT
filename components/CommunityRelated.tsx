'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, ThumbsUp, Star, GitCompare } from 'lucide-react'

interface Post {
  id: string; type: string; category: string | null; title: string
  upvotes: number; comment_count: number; rating: number | null
  created_at: string; user_display_name: string
  community_compare_options?: { vote_count: number }[]
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금 전'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  review:  <Star className="w-3 h-3 text-blue-400" />,
  forum:   <MessageSquare className="w-3 h-3 text-purple-400" />,
  compare: <GitCompare className="w-3 h-3 text-orange-400" />,
}
const TYPE_LABEL: Record<string, string> = { review: '리뷰', forum: '포럼', compare: '투표' }
const TYPE_COLOR: Record<string, string> = {
  review:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  forum:   'bg-purple-500/15 text-purple-400 border-purple-500/20',
  compare: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

export default function CommunityRelated({ productId }: { productId: string }) {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/community/posts?product_id=${productId}&limit=5&sort=hot`)
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
      .finally(() => setLoading(false))
  }, [productId])

  if (!loading && posts.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white">관련 커뮤니티 글</h2>
        <Link href={`/community/write`} className="text-[11px] text-accent hover:underline">글 작성</Link>
      </div>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
          </div>
        ) : (
          posts.map(post => {
            const totalVotes = post.community_compare_options?.reduce((s, o) => s + o.vote_count, 0) ?? 0
            return (
              <Link key={post.id} href={`/community/posts/${post.id}`}
                className="group flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLOR[post.type]}`}>
                      {TYPE_ICON[post.type]} <span className="ml-0.5">{TYPE_LABEL[post.type]}</span>
                    </span>
                    {post.rating != null && <span className="text-[10px] text-accent font-bold">★ {post.rating}</span>}
                    {post.type === 'compare' && totalVotes > 0 && <span className="text-[10px] text-white/30">{totalVotes}표</span>}
                  </div>
                  <p className="text-sm font-semibold text-white/80 group-hover:text-white line-clamp-2 transition-colors">{post.title}</p>
                  <div className="flex items-center gap-2.5 mt-1 text-[11px] text-white/25">
                    <span>{post.user_display_name}</span>
                    <span>{timeAgo(post.created_at)}</span>
                    <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.upvotes}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
        <Link href={`/community?product=${productId}`}
          className="block text-center text-[11px] text-white/25 hover:text-white/50 py-2.5 border-t border-border transition-colors">
          더보기
        </Link>
      </div>
    </div>
  )
}
