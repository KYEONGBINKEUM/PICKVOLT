'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ThumbsUp, MessageSquare, GitCompare, Star, Tag, Send, Trash2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

interface CompareOption { id: string; label: string; vote_count: number; image_url: string | null; product_id: string | null; products?: { id: string; name: string; image_url: string | null } | null }
interface PostProduct { product_id: string; products: { id: string; name: string; brand: string; image_url: string | null; category: string } | null }
interface Post {
  id: string; type: 'review' | 'forum' | 'compare'; category: string | null
  title: string; body: string; rating: number | null
  upvotes: number; comment_count: number; view_count: number
  is_pinned: boolean; created_at: string; updated_at: string
  user_id: string; user_display_name: string; user_avatar_url: string | null
  community_post_products: PostProduct[]
  community_compare_options: CompareOption[]
  my_vote: boolean; my_compare_option: string | null
}
interface Comment {
  id: string; post_id: string; user_id: string; user_display_name: string; user_avatar_url: string | null
  parent_id: string | null; body: string; upvotes: number; created_at: string; my_vote: boolean
}

const CATEGORY_LABEL: Record<string, string> = { laptop: '랩탑', mobile: '모바일', tablet: '태블릿', other: '기타' }
const TYPE_COLOR: Record<string, string> = {
  review: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  forum: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  compare: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}
const TYPE_LABEL: Record<string, string> = { review: '리뷰', forum: '포럼', compare: '투표' }

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return '방금 전'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

function CommentItem({ c, onVote, onReply, currentUserId, token, onDelete }: {
  c: Comment; onVote: (id: string) => void; onReply: (id: string, name: string) => void
  currentUserId: string | null; token: string | null; onDelete: (id: string) => void
}) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        {c.user_avatar_url
          ? <div className="w-6 h-6 rounded-full overflow-hidden relative flex-shrink-0"><Image src={c.user_avatar_url} alt={c.user_display_name} fill className="object-cover" unoptimized /></div>
          : <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0"><span className="text-[10px] text-white/40">{c.user_display_name[0]?.toUpperCase()}</span></div>
        }
        <span className="text-xs font-semibold text-white/60">{c.user_display_name}</span>
        <span className="text-[10px] text-white/25">{timeAgo(c.created_at)}</span>
        {currentUserId === c.user_id && token && (
          <button onClick={() => onDelete(c.id)} className="ml-auto text-white/20 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm text-white/70 leading-relaxed ml-8">{c.body}</p>
      <div className="flex items-center gap-3 mt-2 ml-8">
        <button onClick={() => onVote(c.id)}
          className={`flex items-center gap-1 text-[11px] transition-colors ${c.my_vote ? 'text-accent' : 'text-white/25 hover:text-white/50'}`}>
          <ThumbsUp className="w-3 h-3" />{c.upvotes}
        </button>
        <button onClick={() => onReply(c.id, c.user_display_name)}
          className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
          답글
        </button>
      </div>
    </div>
  )
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [post, setPost]       = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState<string | null>(null)
  const [userId, setUserId]   = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)

  const [comments, setComments]     = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo]       = useState<{ id: string; name: string } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)

  const [voting, setVoting] = useState(false)
  const [compareVoting, setCompareVoting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setToken(data.session?.access_token ?? null)
      setUserId(u?.id ?? null)
      if (u) {
        setDisplayName(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? '')
        setAvatarUrl(u.user_metadata?.avatar_url ?? null)
      }
    })
  }, [])

  const loadPost = useCallback(async () => {
    setLoading(true)
    const headers: Record<string, string> = {}
    const tok = (await supabase.auth.getSession()).data.session?.access_token
    if (tok) headers['Authorization'] = `Bearer ${tok}`
    const res = await fetch(`/api/community/posts/${id}`, { headers })
    if (res.ok) setPost(await res.json())
    setLoading(false)
  }, [id])

  const loadComments = useCallback(async () => {
    const headers: Record<string, string> = {}
    const tok = (await supabase.auth.getSession()).data.session?.access_token
    if (tok) headers['Authorization'] = `Bearer ${tok}`
    const res = await fetch(`/api/community/posts/${id}/comments`, { headers })
    if (res.ok) {
      const d = await res.json()
      setComments(d.comments ?? [])
    }
  }, [id])

  useEffect(() => {
    loadPost()
    loadComments()
  }, [loadPost, loadComments])

  const handleVote = async () => {
    if (!token || voting) return
    setVoting(true)
    const res = await fetch(`/api/community/posts/${id}/vote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const d = await res.json()
      setPost(p => p ? { ...p, upvotes: d.upvotes, my_vote: d.voted } : p)
    }
    setVoting(false)
  }

  const handleCompareVote = async (optionId: string) => {
    if (!token || compareVoting) return
    setCompareVoting(true)
    const res = await fetch(`/api/community/posts/${id}/compare-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ option_id: optionId }),
    })
    if (res.ok) {
      const d = await res.json()
      setPost(p => p ? {
        ...p,
        my_compare_option: d.cancelled ? null : optionId,
        community_compare_options: p.community_compare_options.map(o =>
          o.id === optionId ? { ...o, vote_count: d.vote_count } : o
        )
      } : p)
    }
    setCompareVoting(false)
  }

  const handleCommentVote = async (commentId: string) => {
    if (!token) return
    const res = await fetch(`/api/community/posts/${id}/comments/${commentId}/vote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const d = await res.json()
      setComments(cs => cs.map(c => c.id === commentId ? { ...c, upvotes: d.upvotes, my_vote: d.voted } : c))
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await fetch(`/api/community/posts/${id}/comments/${commentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    })
    setComments(cs => cs.filter(c => c.id !== commentId))
    setPost(p => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p)
  }

  const handleSubmitComment = async () => {
    if (!token || !commentText.trim() || submittingComment) return
    setSubmittingComment(true)
    const res = await fetch(`/api/community/posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        body: commentText.trim(),
        parent_id: replyTo?.id ?? null,
        display_name: displayName,
        avatar_url: avatarUrl,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setComments(cs => [...cs, d.comment])
      setPost(p => p ? { ...p, comment_count: p.comment_count + 1 } : p)
      setCommentText('')
      setReplyTo(null)
    }
    setSubmittingComment(false)
  }

  const handleDeletePost = async () => {
    if (!token || !post) return
    if (!confirm('게시물을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/community/posts/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) router.push('/community')
  }

  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="flex justify-center py-32">
        <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
      </div>
    </div>
  )
  if (!post) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-white/40 text-sm">게시물을 찾을 수 없습니다</p>
        <Link href="/community" className="mt-4 text-xs text-accent hover:underline">커뮤니티로 돌아가기</Link>
      </div>
    </div>
  )

  const total = post.community_compare_options.reduce((s, o) => s + o.vote_count, 0)
  const backHref = post.type === 'review' ? '/community/reviews' : post.type === 'forum' ? '/community/forum' : '/community/compare'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={backHref} className="text-white/30 hover:text-white/60 transition-colors"><ChevronLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLOR[post.type]}`}>{TYPE_LABEL[post.type]}</span>
            {post.category && <span className="text-xs text-white/30">{CATEGORY_LABEL[post.category]}</span>}
          </div>
          {userId === post.user_id && (
            <button onClick={handleDeletePost} className="ml-auto text-white/20 hover:text-red-400 transition-colors flex items-center gap-1 text-xs">
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </button>
          )}
        </div>

        {/* Post body */}
        <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
          <h1 className="text-xl font-black text-white mb-3 leading-snug">{post.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-4 text-[11px] text-white/30">
            {post.user_avatar_url
              ? <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0"><Image src={post.user_avatar_url} alt={post.user_display_name} fill className="object-cover" unoptimized /></div>
              : <div className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0"><span className="text-[9px] text-white/40">{post.user_display_name[0]?.toUpperCase()}</span></div>
            }
            <span>{post.user_display_name}</span>
            <span>{timeAgo(post.created_at)}</span>
            <span>{post.view_count ?? 0} 조회</span>
          </div>

          {/* Rating (review) */}
          {post.type === 'review' && post.rating != null && (
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-2xl font-black text-accent">{post.rating}</span>
              <span className="text-sm text-white/30">/10</span>
            </div>
          )}

          {/* Compare options */}
          {post.type === 'compare' && post.community_compare_options.length > 0 && (
            <div className="space-y-2.5 mb-4">
              {post.community_compare_options.map((opt, i) => {
                const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
                const isChosen = post.my_compare_option === opt.id
                const label = i === 0 ? 'A' : i === 1 ? 'B' : i === 2 ? 'C' : 'D'
                return (
                  <button key={opt.id} onClick={() => handleCompareVote(opt.id)} disabled={compareVoting || !token}
                    className={`w-full relative rounded-xl border p-3.5 overflow-hidden text-left transition-all ${isChosen ? 'border-accent/60 bg-accent/5' : 'border-border bg-surface-2 hover:border-white/20'}`}>
                    <div className="absolute inset-0 transition-all duration-500" style={{ width: `${pct}%`, background: isChosen ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.03)' }} />
                    <div className="relative flex items-center gap-3">
                      {opt.products?.image_url && (
                        <div className="w-10 h-10 rounded-lg bg-surface overflow-hidden relative flex-shrink-0">
                          <Image src={opt.products.image_url} alt={opt.label} fill className="object-contain p-1" unoptimized />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-white/30 font-bold">{label}안</span>
                          {isChosen && <span className="text-[10px] text-accent font-bold">✓ 내 선택</span>}
                        </div>
                        <p className="text-sm font-semibold text-white/80 truncate">{opt.label}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xl font-black text-white">{pct}<span className="text-xs text-white/30">%</span></p>
                        <p className="text-[10px] text-white/30">{opt.vote_count}표</p>
                      </div>
                    </div>
                  </button>
                )
              })}
              <p className="text-[11px] text-white/25 text-center">{total}명 참여{!token && ' · 로그인 후 투표 가능'}</p>
            </div>
          )}

          {/* Body text */}
          {post.body && (
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{post.body}</p>
          )}

          {/* Product tags */}
          {post.community_post_products.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] text-white/30"><Tag className="w-3 h-3" /> 관련 제품</div>
              <div className="flex flex-wrap gap-2">
                {post.community_post_products.map(pp => pp.products && (
                  <Link key={pp.product_id} href={`/product/${pp.products.id}`}
                    className="flex items-center gap-2 bg-surface-2 border border-border rounded-full px-2.5 py-1 hover:border-white/20 transition-colors">
                    {pp.products.image_url && (
                      <div className="w-4 h-4 relative"><Image src={pp.products.image_url} alt={pp.products.name} fill className="object-contain" unoptimized /></div>
                    )}
                    <span className="text-xs text-white/60">{pp.products.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Vote / icon row */}
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
            <button onClick={handleVote} disabled={voting || !token}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${post.my_vote ? 'text-accent' : 'text-white/30 hover:text-white/60'}`}>
              <ThumbsUp className={`w-4 h-4 ${post.my_vote ? 'fill-accent' : ''}`} />
              {post.upvotes}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-white/30">
              <MessageSquare className="w-4 h-4" />{post.comment_count}
            </span>
            {post.type === 'compare' && (
              <span className="flex items-center gap-1.5 text-sm text-white/30">
                <GitCompare className="w-4 h-4" />{total}표
              </span>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-bold text-white">댓글 {post.comment_count}</h2>
          </div>

          {/* Comment list */}
          <div className="px-5 divide-y divide-border">
            {comments.length === 0
              ? <p className="text-xs text-white/20 text-center py-8">아직 댓글이 없어요</p>
              : comments.map(c => (
                <CommentItem key={c.id} c={c}
                  onVote={handleCommentVote}
                  onReply={(pid, name) => setReplyTo({ id: pid, name })}
                  currentUserId={userId}
                  token={token}
                  onDelete={handleDeleteComment}
                />
              ))
            }
          </div>

          {/* Comment input */}
          <div className="px-5 py-4 border-t border-border">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-surface-2 rounded-lg">
                <span className="text-xs text-white/40">@{replyTo.name}에게 답글</span>
                <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white/60 text-xs">취소</button>
              </div>
            )}
            {token ? (
              <div className="flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment() } }}
                  placeholder="댓글을 입력하세요..." maxLength={500}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors" />
                <button onClick={handleSubmitComment} disabled={!commentText.trim() || submittingComment}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-xl px-3 py-2.5 transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center">
                <Link href="/login" className="text-accent hover:underline">로그인</Link>하면 댓글을 달 수 있어요
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
