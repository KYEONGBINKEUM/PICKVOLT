'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ThumbsUp, MessageSquare } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { extractFirstImage, stripHtml, timeAgo } from '@/components/PostFeed'

interface Post {
  id: string
  type: string
  title: string
  body: string
  upvotes: number
  comment_count: number
  rating: number | null
  created_at: string
  user_display_name: string
  community_post_products?: { products: { id: string; name: string } | null }[]
}

export default function CommunityRelated({ productId }: { productId: string }) {
  const { t } = useI18n()
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/community/posts?product_id=${productId}&limit=5&sort=hot`)
      .then(r => r.json())
      .then(d => setPosts((d.posts ?? []).filter((p: Post) => p.type !== 'review')))
      .finally(() => setLoading(false))
  }, [productId])

  if (!loading && posts.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold text-white mb-3">{t('community.related_posts')}</h2>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        ) : posts.map(post => {
          const isHtml = /<[a-z]/i.test(post.body ?? '')
          const thumbUrl = isHtml ? extractFirstImage(post.body) : null
          const plainText = isHtml ? stripHtml(post.body) : (post.body ?? '')
          const linkedProduct = post.community_post_products?.[0]?.products

          return (
            <Link key={post.id} href={`/community/posts/${post.id}`}
              className="group flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-border last:border-0">

              {thumbUrl && (
                <div className="flex-shrink-0 mt-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl} alt="" className="w-14 h-14 object-contain rounded-lg bg-surface-2 p-0.5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {linkedProduct && (
                  <span className="inline-flex items-center text-[9px] font-semibold bg-accent/10 text-accent/70 border border-accent/20 rounded-full px-2 py-0.5 mb-1">
                    {linkedProduct.name}
                  </span>
                )}
                <p className="text-sm font-semibold text-white/80 group-hover:text-white line-clamp-2 transition-colors mb-0.5">
                  {post.title}
                </p>
                {!thumbUrl && plainText && (
                  <p className="text-xs text-white/30 line-clamp-2 leading-relaxed mb-1">{plainText}</p>
                )}
                <div className="flex items-center gap-2.5 text-[11px] text-white/25">
                  <span>{post.user_display_name}</span>
                  <span>{timeAgo(post.created_at, t)}</span>
                  {post.rating != null && <span className="text-amber-400 font-bold">★ {post.rating}</span>}
                  <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.upvotes}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                </div>
              </div>
            </Link>
          )
        })}
        <Link href={`/community?product=${productId}`}
          className="block text-center text-[11px] text-white/25 hover:text-white/50 py-2.5 border-t border-border transition-colors">
          {t('community.more')}
        </Link>
      </div>
    </div>
  )
}
