'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { extractFirstImage, timeAgo, type FeedPost } from '@/components/PostFeed'
import { BLOG_CATEGORIES } from '@/lib/blogCategories'
import { imgUrl } from '@/lib/utils'

function catLabel(t: (k: string) => string, category?: string | null) {
  if (!category) return null
  const found = BLOG_CATEGORIES.find((c) => c.slug === category)
  return found ? t(found.labelKey) : null
}

function deckText(post: FeedPost): string {
  const isHtml = /<[a-z]/i.test(post.body ?? '')
  const plain = isHtml ? (post.body ?? '').replace(/<[^>]+>/g, ' ') : (post.body ?? '')
  return plain.replace(/\s+/g, ' ').trim()
}

function HeroStory({ post, t }: { post: FeedPost; t: (k: string) => string }) {
  const isHtml = /<[a-z]/i.test(post.body ?? '')
  const image = isHtml ? extractFirstImage(post.body) : null
  const cat = catLabel(t, post.category)
  const deck = deckText(post)

  return (
    <Link href={`/community/posts/${post.id}`} className="group block">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl(image, 900)}
          alt=""
          className="w-full h-[220px] sm:h-[320px] object-cover border border-border mb-3"
        />
      )}
      {cat && (
        <span className="block text-accent text-[11px] font-bold uppercase tracking-wider mb-1.5">
          {cat}
        </span>
      )}
      <p className="font-serif font-bold text-white leading-tight text-2xl sm:text-[34px] group-hover:text-white/80 transition-colors line-clamp-3">
        {post.title}
      </p>
      {deck && (
        <p className="mt-2 text-sm text-white/50 line-clamp-2">{deck}</p>
      )}
      <p className="mt-2 text-xs text-white/30">
        {post.user_display_name} · {timeAgo(post.created_at, t)}
      </p>
    </Link>
  )
}

function SecondaryStory({ post, t }: { post: FeedPost; t: (k: string) => string }) {
  const isHtml = /<[a-z]/i.test(post.body ?? '')
  const image = isHtml ? extractFirstImage(post.body) : null
  const cat = catLabel(t, post.category)

  return (
    <Link href={`/community/posts/${post.id}`} className="group flex gap-3 py-3 border-t border-border first:border-t-0 first:pt-0">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl(image, 200)}
          alt=""
          className="w-16 h-16 object-cover flex-shrink-0 border border-border"
        />
      )}
      <div className="min-w-0">
        {cat && (
          <span className="block text-accent text-[10px] font-bold uppercase tracking-wider mb-1">
            {cat}
          </span>
        )}
        <p className="font-serif font-bold text-white leading-snug text-[15px] group-hover:text-white/80 transition-colors line-clamp-2">
          {post.title}
        </p>
      </div>
    </Link>
  )
}

export default function HomeFeatured({ posts }: { posts: FeedPost[] }) {
  const { t } = useI18n()
  if (posts.length === 0) return null

  const [hero, ...secondary] = posts
  const side = secondary.slice(0, 3)

  return (
    <section className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 md:gap-8 pb-6 mb-6 border-b border-border">
      <HeroStory post={hero} t={t} />
      {side.length > 0 && (
        <div>
          {side.map((p) => (
            <SecondaryStory key={p.id} post={p} t={t} />
          ))}
        </div>
      )}
    </section>
  )
}
