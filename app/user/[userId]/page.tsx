'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { BadgeCheck, LayoutGrid, LayoutList } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { CardPost, CompactPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'
import { useI18n } from '@/lib/i18n'
import { imgUrl } from '@/lib/utils'

interface ChannelInfo {
  user_id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  is_official: boolean
  post_count: number
  subscriber_count: number
  is_subscribed: boolean
  is_own: boolean
}

const LIMIT = 20

export default function ChannelPage() {
  const { userId } = useParams<{ userId: string }>()
  const { t } = useI18n()
  const [channel, setChannel] = useState<ChannelInfo | null>(null)
  const [channelLoading, setChannelLoading] = useState(true)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [compact, setCompact] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenReady, setTokenReady] = useState(false)
  const tokenRef = useRef<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null
      setToken(t)
      tokenRef.current = t
      setTokenReady(true)
    })
  }, [])

  // Load channel info
  useEffect(() => {
    if (!tokenReady) return
    const headers: Record<string, string> = {}
    if (tokenRef.current) headers['Authorization'] = `Bearer ${tokenRef.current}`
    fetch(`/api/user/${userId}/channel`, { headers })
      .then(r => r.json())
      .then(d => setChannel(d))
      .finally(() => setChannelLoading(false))
  }, [userId, tokenReady])

  // Load posts (page 1)
  const loadFirst = useCallback(() => {
    setLoading(true)
    setPosts([])
    setPage(1)
    setHasMore(true)
    const headers: Record<string, string> = {}
    if (tokenRef.current) headers['Authorization'] = `Bearer ${tokenRef.current}`
    fetch(`/api/user/${userId}/posts?page=1&limit=${LIMIT}`, { headers })
      .then(r => r.json())
      .then(d => {
        const fetched = d.posts ?? []
        setPosts(fetched)
        setHasMore(fetched.length === LIMIT && fetched.length < (d.total ?? 0))
        setPage(2)
      })
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { if (tokenReady) loadFirst() }, [tokenReady, loadFirst])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const headers: Record<string, string> = {}
    if (tokenRef.current) headers['Authorization'] = `Bearer ${tokenRef.current}`
    fetch(`/api/user/${userId}/posts?page=${page}&limit=${LIMIT}`, { headers })
      .then(r => r.json())
      .then(d => {
        const fetched = d.posts ?? []
        setPosts(prev => [...prev, ...fetched])
        setHasMore(fetched.length === LIMIT)
        setPage(p => p + 1)
      })
      .finally(() => setLoadingMore(false))
  }, [userId, page, loadingMore, hasMore])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

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

  const handleSubscribe = async () => {
    if (!token || !channel || subscribing) return
    setSubscribing(true)
    try {
      const res = await fetch(`/api/user/${userId}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setChannel(prev => prev ? { ...prev, is_subscribed: d.subscribed, subscriber_count: d.subscriber_count } : prev)
      }
    } finally {
      setSubscribing(false)
    }
  }

  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar communityContext />
        <main className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">
          <div className="animate-pulse">
            <div className="flex items-center gap-4 py-8 border-b border-border mb-6">
              <div className="w-20 h-20 rounded-full bg-white/8" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-white/8 rounded" />
                <div className="h-3 w-24 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!channel || (channel as { error?: string }).error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar communityContext />
        <main className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">
          <div className="py-24 text-center">
            <p className="text-sm text-white/20">채널을 찾을 수 없습니다.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar communityContext />
      <main className="max-w-[960px] mx-auto px-4 pt-[88px] pb-20">

        {/* Channel Header */}
        <div className="flex items-start gap-4 py-8 border-b border-border mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {channel.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl(channel.avatar_url, 80)}
                alt={channel.nickname}
                className="w-20 h-20 rounded-full object-cover bg-surface-2"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/8 flex items-center justify-center">
                <span className="text-2xl font-bold text-white/40">
                  {channel.nickname?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-white leading-none">{channel.nickname}</h1>
              {channel.is_official && (
                <BadgeCheck className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(255,77,0)' }} />
              )}
            </div>
            {channel.is_official && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                style={{ background: 'rgba(255,77,0,0.15)', color: 'rgba(255,77,0,0.9)' }}>
                {t('channel.official')}
              </span>
            )}
            <div className="flex items-center gap-3 text-xs text-white/30 mb-2">
              <span><span className="text-white/60 font-semibold">{channel.subscriber_count.toLocaleString()}</span> {t('channel.subscribers')}</span>
              <span><span className="text-white/60 font-semibold">{channel.post_count.toLocaleString()}</span> {t('channel.posts')}</span>
            </div>
            {channel.bio && (
              <p className="text-sm text-white/40 leading-relaxed max-w-lg">{channel.bio}</p>
            )}
          </div>

          {/* Subscribe button */}
          {!channel.is_own && token && (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 ${
                channel.is_subscribed
                  ? 'bg-white/8 text-white/60 hover:bg-white/12 border border-border'
                  : 'text-white'
              }`}
              style={!channel.is_subscribed ? { background: 'rgb(255,77,0)' } : undefined}
            >
              {channel.is_subscribed ? t('channel.subscribed') : t('channel.subscribe')}
            </button>
          )}
        </div>

        {/* Posts header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-white/60">{t('channel.posts')}</span>
          <div className="ml-auto flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
            <button onClick={() => setCompact(false)} className={`p-1.5 rounded-md transition-colors ${!compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCompact(true)} className={`p-1.5 rounded-md transition-colors ${compact ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}>
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Posts */}
        <div>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)
            : posts.length === 0
            ? <div className="py-24 text-center"><p className="text-sm text-white/20">{t('channel.no_posts')}</p></div>
            : posts.map(post =>
                compact
                  ? <CompactPost key={post.id} post={post} token={token} onVote={handleVote} t={t} showType />
                  : <CardPost    key={post.id} post={post} token={token} onVote={handleVote} t={t} showType />
              )
          }
        </div>

        <div ref={sentinelRef} className="h-4" />
        {loadingMore && Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} compact={compact} />)}
      </main>
    </div>
  )
}
