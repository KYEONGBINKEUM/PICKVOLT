'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ThumbsUp, ThumbsDown, MessageSquare, Star, Tag,
  Send, Trash2, Eye, ArrowLeft, CornerDownRight, ImagePlus, Pencil, X, Check, Flag, Languages
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import RichEditor from '@/components/RichEditor'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

interface CompareOption {
  id: string; label: string; vote_count: number
  image_url: string | null; product_id: string | null
  products?: { id: string; name: string; image_url: string | null } | null
}
interface PostProduct {
  product_id: string
  products: { id: string; name: string; brand: string; image_url: string | null; category: string } | null
}
interface Post {
  id: string; type: 'review' | 'forum' | 'compare'; category: string | null
  title: string; body: string; rating: number | null
  upvotes: number; downvotes?: number; comment_count: number; view_count: number
  is_pinned: boolean; created_at: string; updated_at: string
  user_id: string; user_display_name: string; user_avatar_url: string | null
  community_post_products: PostProduct[]
  community_compare_options: CompareOption[]
  my_vote: boolean; my_downvote?: boolean; my_compare_option: string | null
}
interface Comment {
  id: string; post_id: string; user_id: string
  user_display_name: string; user_avatar_url: string | null
  parent_id: string | null; body: string; upvotes: number
  created_at: string; my_vote: boolean
  downvotes?: number; my_downvote?: boolean
}

function timeAgo(d: string, t: (k: string) => string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return t('time.just')
  if (s < 3600) return `${Math.floor(s / 60)}${t('time.min')}`
  if (s < 86400) return `${Math.floor(s / 3600)}${t('time.hour')}`
  return `${Math.floor(s / 86400)}${t('time.day')}`
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 text-accent px-1 py-0.5 rounded text-[0.85em] font-mono">$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-white/20 pl-3 text-white/50 italic">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/!\[([^\]]*)\]\(\s*(https?:\/\/[^\s)]+)\s*\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-xl my-3 border border-white/10" style="max-height:600px;object-fit:contain;" />')
    .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br />')
}

function MarkdownBody({ text }: { text: string }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(text)
  return (
    <div
      className="text-sm text-white/75 leading-relaxed prose-custom"
      dangerouslySetInnerHTML={{
        __html: isHtml ? text : `<p class="mb-3">${renderMarkdown(text)}</p>`
      }}
    />
  )
}

const AVATAR_SZ: Record<number, string> = { 5:'w-5 h-5', 6:'w-6 h-6', 7:'w-7 h-7', 8:'w-8 h-8' }

function Avatar({ url, name, size = 7 }: { url: string | null; name: string; size?: number }) {
  const sz = AVATAR_SZ[size] ?? 'w-7 h-7'
  if (url) return (
    <div className={`${sz} rounded-full overflow-hidden relative flex-shrink-0`}>
      <Image src={url} alt={name} fill className="object-cover" unoptimized />
    </div>
  )
  return (
    <div className={`${sz} rounded-full flex-shrink-0 bg-surface-2 flex items-center justify-center`}>
      <span className="text-[10px] text-white/40 font-bold">{name[0]?.toUpperCase()}</span>
    </div>
  )
}

function CommentItem({ c, depth = 0, onVote, onDownvote, onReply, onReport, currentUserId, token, onDelete, t }: {
  c: Comment; depth?: number
  onVote: (id: string) => void
  onDownvote: (id: string) => void
  onReply: (id: string, name: string) => void
  onReport: (id: string) => void
  currentUserId: string | null; token: string | null
  onDelete: (id: string) => void
  t: (k: string) => string
}) {
  return (
    <div className={depth > 0 ? 'ml-8 border-l border-border pl-4' : ''}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar url={c.user_avatar_url} name={c.user_display_name} size={6} />
          <span className="text-xs font-semibold text-white/70">{c.user_display_name}</span>
          <span className="text-[10px] text-white/25">{timeAgo(c.created_at, t)}</span>
          {currentUserId === c.user_id && token && (
            <button onClick={() => onDelete(c.id)} className="ml-auto text-white/20 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-sm text-white/65 leading-relaxed ml-8"
          dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${renderMarkdown(c.body)}</p>` }} />
        <div className="flex items-center gap-3 mt-2 ml-8">
          <button onClick={() => onVote(c.id)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${c.my_vote ? 'text-accent' : 'text-white/25 hover:text-white/50'}`}>
            <ThumbsUp className="w-3.5 h-3.5" /><span className="tabular-nums">{c.upvotes}</span>
          </button>
          <button onClick={() => onDownvote(c.id)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${c.my_downvote ? 'text-red-400' : 'text-white/25 hover:text-white/50'}`}>
            <ThumbsDown className="w-3.5 h-3.5" />{(c.downvotes ?? 0) > 0 && <span className="tabular-nums">{c.downvotes}</span>}
          </button>
          <button onClick={() => onReply(c.id, c.user_display_name)}
            className="flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition-colors">
            <CornerDownRight className="w-3 h-3" /> {t('post.reply')}
          </button>
          {token && currentUserId !== c.user_id && (
            <button onClick={() => onReport(c.id)}
              className="flex items-center gap-1 text-[11px] text-white/20 hover:text-orange-400 transition-colors ml-auto">
              <Flag className="w-3 h-3" /> {t('report.btn')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { t, locale } = useI18n()

  const [post, setPost]       = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState<string | null>(null)
  const [userId, setUserId]   = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)

  const [comments, setComments]                     = useState<Comment[]>([])
  const [commentText, setCommentText]               = useState('')
  const [replyTo, setReplyTo]                       = useState<{ id: string; name: string } | null>(null)
  const [submittingComment, setSubmittingComment]   = useState(false)
  const [voting, setVoting]                         = useState(false)
  const [downvoting, setDownvoting]                 = useState(false)
  const [compareVoting, setCompareVoting]           = useState(false)
  const [commentImages, setCommentImages]           = useState<string[]>([])
  const [uploadingImage, setUploadingImage]         = useState(false)
  const fileInputRef                                = useRef<HTMLInputElement>(null)

  // 번역
  const [translating, setTranslating] = useState(false)
  const [translated, setTranslated]   = useState<{ title: string; body: string } | null>(null)

  // 수정 모드
  const [isEditing, setIsEditing]   = useState(false)
  const [editTitle, setEditTitle]   = useState('')
  const [editBody, setEditBody]     = useState('')
  const [editRating, setEditRating] = useState<number | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const editEditorRef = useRef<HTMLDivElement | null>(null)

  // 신고 모달
  const [reportTarget, setReportTarget]   = useState<{ type: 'post' | 'comment'; id: string } | null>(null)
  const [reportReason, setReportReason]   = useState('')
  const [reportDetail, setReportDetail]   = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportDone, setReportDone]       = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u   = data.session?.user
      const tok = data.session?.access_token ?? null
      setToken(tok)
      setUserId(u?.id ?? null)
      if (u) {
        // profiles 테이블에서 nickname + avatar 우선 사용 (실명/구글이미지 노출 방지)
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('user_id', u.id)
          .maybeSingle()
        setDisplayName(profile?.nickname ?? u.email?.split('@')[0] ?? 'user')
        setAvatarUrl(profile?.avatar_url ?? null)
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
      const data = await res.json()
      setComments((data.comments ?? []).map((c: Comment) => ({ downvotes: 0, my_downvote: false, ...c })))
    }
  }, [id])

  useEffect(() => { loadPost(); loadComments() }, [loadPost, loadComments])

  const handleVote = async () => {
    if (!token || voting) return
    setVoting(true)
    const res = await fetch(`/api/community/posts/${id}/vote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      // 추천 시 비추천 자동 해제
      setPost(p => p ? { ...p, upvotes: d.upvotes, my_vote: d.voted, downvotes: d.downvotes, my_downvote: false } : p)
    }
    setVoting(false)
  }

  const handleDownvote = async () => {
    if (!token || downvoting) return
    setDownvoting(true)
    const res = await fetch(`/api/community/posts/${id}/downvote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      // 비추천 시 추천 자동 해제
      setPost(p => p ? { ...p, downvotes: d.downvotes, my_downvote: d.voted, upvotes: d.upvotes, my_vote: false } : p)
    }
    setDownvoting(false)
  }

  const handleReport = async () => {
    if (!token || !reportTarget || !reportReason || submittingReport) return
    setSubmittingReport(true)
    const res = await fetch('/api/community/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_type: reportTarget.type, target_id: reportTarget.id, reason: reportReason, detail: reportDetail }),
    })
    setSubmittingReport(false)
    if (res.ok || res.status === 409) {
      setReportDone(true)
      setTimeout(() => {
        setReportTarget(null)
        setReportReason('')
        setReportDetail('')
        setReportDone(false)
      }, 1500)
    }
  }

  const handleStartEdit = () => {
    if (!post) return
    setEditTitle(post.title)
    setEditBody(post.body)
    setEditRating(post.rating)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!token || !post || !editTitle.trim() || savingEdit) return
    setSavingEdit(true)
    const res = await fetch(`/api/community/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: editTitle.trim(), body: editBody, rating: editRating }),
    })
    if (res.ok) {
      setPost(p => p ? { ...p, title: editTitle.trim(), body: editBody, rating: editRating, updated_at: new Date().toISOString() } : p)
      setIsEditing(false)
    }
    setSavingEdit(false)
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
        ),
      } : p)
    }
    setCompareVoting(false)
  }

  const handleCommentVote = async (commentId: string) => {
    if (!token) return
    const res = await fetch(`/api/community/posts/${id}/comments/${commentId}/vote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      setComments(cs => cs.map(c => c.id === commentId
        ? { ...c, upvotes: d.upvotes, my_vote: d.voted, downvotes: d.downvotes, my_downvote: false }
        : c))
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!token || !confirm(t('comment.delete_confirm'))) return
    await fetch(`/api/community/posts/${id}/comments/${commentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    setComments(cs => cs.filter(c => c.id !== commentId))
    setPost(p => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/comment-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.ok) {
        const { url } = await res.json()
        setCommentImages(prev => [...prev, url])
      }
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmitComment = async () => {
    if (!token || (!commentText.trim() && commentImages.length === 0) || submittingComment) return
    setSubmittingComment(true)
    const fullBody = commentImages.length > 0
      ? [commentText.trim(), ...commentImages.map(url => `![image](${url})`)].filter(Boolean).join('\n')
      : commentText.trim()
    const res = await fetch(`/api/community/posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        body: fullBody,
        parent_id: replyTo?.id ?? null,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setComments(cs => [...cs, d.comment])
      setPost(p => p ? { ...p, comment_count: p.comment_count + 1 } : p)
      setCommentText('')
      setCommentImages([])
      setReplyTo(null)
    }
    setSubmittingComment(false)
  }

  const handleCommentDownvote = async (commentId: string) => {
    if (!token) return
    const res = await fetch(`/api/community/posts/${id}/comments/${commentId}/downvote`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      setComments(cs => cs.map(c => c.id === commentId
        ? { ...c, downvotes: d.downvotes, my_downvote: d.voted, upvotes: d.upvotes, my_vote: false }
        : c))
    }
  }

  const handleDeletePost = async () => {
    if (!token || !post || !confirm(t('post.delete_confirm'))) return
    const res = await fetch(`/api/community/posts/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) router.push('/community')
  }

  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="max-w-[900px] mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-48 bg-surface border border-border rounded animate-pulse" />
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
        <div className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    </div>
  )

  if (!post) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-white/40 text-sm">{t('post.not_found')}</p>
        <Link href="/community" className="text-xs text-accent hover:underline">{t('post.back_community')}</Link>
      </div>
    </div>
  )

  const total = post.community_compare_options.reduce((s, o) => s + o.vote_count, 0)
  const backHref = post.type === 'review' ? '/community/reviews'
    : post.type === 'forum' ? '/community/forum'
    : '/community'
  const backLabel = post.type === 'review' ? t('community.reviews')
    : post.type === 'forum' ? t('community.forum')
    : t('community.compare')

  const topComments   = comments.filter(c => !c.parent_id)
  const childComments = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  const ratingLabel = (r: number) =>
    r >= 9 ? t('post.rating.excellent')
    : r >= 7 ? t('post.rating.good')
    : r >= 5 ? t('post.rating.average')
    : t('post.rating.poor')

  const needsTranslation = (text: string) => {
    const hasKorean   = /[\uAC00-\uD7A3]/.test(text)
    const hasJapanese = /[\u3040-\u30FF]/.test(text)
    const hasCJK      = /[\u4E00-\u9FFF]/.test(text)
    const hasCyrillic = /[\u0400-\u04FF]/.test(text)
    const hasArabic   = /[\u0600-\u06FF]/.test(text)
    const hasNonLatin = hasKorean || hasJapanese || hasCJK || hasCyrillic || hasArabic
    if (locale === 'ko') return !hasKorean
    if (locale === 'ja') return !hasJapanese && !hasCJK
    return hasNonLatin
  }

  const handleTranslate = async () => {
    if (!post) return
    if (translated) { setTranslated(null); return }
    setTranslating(true)
    try {
      const plainBody = post.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const [title, body] = await Promise.all([
        fetch(`/api/translate?q=${encodeURIComponent(post.title)}&tl=${locale}`).then(r => r.json()).then(d => d.text ?? post.title),
        plainBody ? fetch(`/api/translate?q=${encodeURIComponent(plainBody)}&tl=${locale}`).then(r => r.json()).then(d => d.text ?? plainBody) : Promise.resolve(''),
      ])
      setTranslated({ title, body })
    } finally {
      setTranslating(false)
    }
  }

  const showTranslateBtn = post ? needsTranslation(post.title + ' ' + post.body.replace(/<[^>]+>/g, '')) : false

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[900px] mx-auto px-4 pt-[88px] pb-20">

        {/* 뒤로가기 */}
        <Link href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          {backLabel}
        </Link>

        {/* 게시물 카드 */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
          <div>
            {/* 본문 */}
            <div className="p-5">
              {/* 삭제/수정 버튼 */}
              {userId === post.user_id && !isEditing && (
                <div className="flex justify-end gap-3 mb-2">
                  <button onClick={handleStartEdit}
                    className="text-white/20 hover:text-white/60 transition-colors flex items-center gap-1 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> {t('post.edit')}
                  </button>
                  <button onClick={handleDeletePost}
                    className="text-white/20 hover:text-red-400 transition-colors flex items-center gap-1 text-xs">
                    <Trash2 className="w-3.5 h-3.5" /> {t('post.delete')}
                  </button>
                </div>
              )}

              {/* 메타 */}
              <div className="flex items-center gap-2 mb-3 text-[11px] text-white/30 flex-wrap">
                <Avatar url={post.user_avatar_url} name={post.user_display_name} size={5} />
                <span className="font-medium text-white/50">{post.user_display_name}</span>
                <span>·</span>
                <span>{timeAgo(post.created_at, t)}</span>
                {post.updated_at && post.created_at &&
                  Math.abs(new Date(post.updated_at).getTime() - new Date(post.created_at).getTime()) > 5000 && (
                  <>
                    <span>·</span>
                    <span className="text-white/20">{t('post.edited')} {timeAgo(post.updated_at, t)}</span>
                  </>
                )}
                {post.category && (
                  <>
                    <span>·</span>
                    <span>{t(`cat.${post.category}`) || post.category}</span>
                  </>
                )}
                <span className="flex items-center gap-1 ml-auto"><Eye className="w-3 h-3" />{post.view_count}</span>
              </div>

              {/* 수정 모드 */}
              {isEditing ? (
                <div className="space-y-3 mb-4">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-base font-bold text-white outline-none focus:border-white/20 transition-colors"
                    placeholder={t('write.title')}
                  />
                  {post.type === 'review' && editRating !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">Rating:</span>
                      {[1,2,3,4,5].map(star => {
                        const filled = Math.round((editRating ?? 0) / 2) >= star
                        return (
                          <button key={star} type="button" onClick={() => setEditRating(star * 2)}
                            className="p-0.5 transition-transform hover:scale-110">
                            <svg width="28" height="28" viewBox="0 0 24 24"
                              fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"
                              className={filled ? 'text-amber-400' : 'text-white/15'}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        )
                      })}
                      <span className="text-sm font-bold text-amber-400 ml-1">{editRating}/10</span>
                    </div>
                  )}
                  <RichEditor
                    editorRef={editEditorRef}
                    onChange={setEditBody}
                    token={token}
                    placeholder={t('write.body')}
                    uploadSizeError={t('write.img_size_error')}
                    uploadFailText={t('write.img_upload_fail')}
                    urlPrompt={t('write.toolbar.url')}
                    initialHtml={editBody}
                    minHeight="200px"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 border border-border hover:border-white/20 transition-all">
                      <X className="w-3.5 h-3.5" /> {t('comment.cancel')}
                    </button>
                    <button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent/90 text-white transition-all disabled:opacity-40">
                      <Check className="w-3.5 h-3.5" /> {t('post.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 제목 */}
                  <h1 className="text-xl font-black text-white mb-4 leading-snug">
                    {translated?.title ?? post.title}
                  </h1>

              {/* 평점 (리뷰) — 별점 표시 */}
              {post.type === 'review' && post.rating != null && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-black/20 rounded-xl border border-border">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(star => {
                      const filled = Math.round(post.rating! / 2) >= star
                      return (
                        <svg key={star} width="20" height="20" viewBox="0 0 24 24"
                          fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"
                          className={filled ? 'text-amber-400' : 'text-white/15'}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )
                    })}
                  </div>
                  <span className="text-2xl font-black text-amber-400 tabular-nums">{post.rating}</span>
                  <span className="text-sm text-white/30">/10</span>
                  <span className="text-sm text-white/40">{ratingLabel(post.rating)}</span>
                </div>
              )}

              {/* 비교투표 옵션 */}
              {post.type === 'compare' && post.community_compare_options.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {post.community_compare_options.map((opt, i) => {
                    const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
                    const isChosen = post.my_compare_option === opt.id
                    return (
                      <button key={opt.id} onClick={() => handleCompareVote(opt.id)}
                        disabled={compareVoting || !token}
                        className={`w-full relative rounded-xl border p-3.5 overflow-hidden text-left transition-all ${
                          isChosen ? 'border-accent/60' : 'border-border hover:border-white/20'
                        }`}>
                        <div className="absolute inset-0 transition-all duration-700 rounded-xl"
                          style={{
                            width: `${pct}%`,
                            background: isChosen ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(255,255,255,0.04)',
                          }} />
                        <div className="relative flex items-center gap-3">
                          {opt.products?.image_url && (
                            <div className="w-10 h-10 rounded-lg bg-surface overflow-hidden relative flex-shrink-0">
                              <Image src={opt.products.image_url} alt={opt.label} fill className="object-contain p-1" unoptimized />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-black text-white/30">
                                {String.fromCharCode(65 + i)}
                              </span>
                              {isChosen && <span className="text-[10px] text-accent font-bold">✓ {t('post.my_pick')}</span>}
                            </div>
                            <p className="text-sm font-semibold text-white/80 truncate">{opt.label}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-2xl font-black text-white">{pct}<span className="text-xs text-white/30">%</span></p>
                            <p className="text-[10px] text-white/30">{opt.vote_count} {t('community.votes')}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  <p className="text-[11px] text-white/25 text-center">
                    {total} {t('post.participants')}{!token ? ` · ${t('post.login_vote')}` : ''}
                  </p>
                </div>
              )}

              {/* 본문 */}
              {(post.body || translated?.body) && (
                <div className="mb-4">
                  {translated?.body
                    ? <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{translated.body}</p>
                    : <MarkdownBody text={post.body} />
                  }
                </div>
              )}

              {/* 관련 제품 */}
              {post.community_post_products.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] text-white/30">
                    <Tag className="w-3 h-3" /> {t('post.related')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.community_post_products.map(pp => pp.products && (
                      <Link key={pp.product_id} href={`/product/${pp.products.id}`}
                        className="flex items-center gap-2 bg-surface-2 border border-border rounded-full px-2.5 py-1 hover:border-white/20 transition-colors">
                        {pp.products.image_url && (
                          <div className="w-4 h-4 relative">
                            <Image src={pp.products.image_url} alt={pp.products.name} fill className="object-contain" unoptimized />
                          </div>
                        )}
                        <span className="text-xs text-white/60">{pp.products.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단 추천 */}
              <div className={`flex items-center gap-3 flex-wrap ${post.community_post_products.length > 0 ? 'mt-4' : 'mt-4 pt-4 border-t border-border'}`}>
                <button onClick={handleVote} disabled={voting || !token}
                  title={!token ? t('post.login_vote') : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    post.my_vote
                      ? 'bg-accent/15 text-accent border-accent/30'
                      : 'text-white/40 border-border hover:text-white/70 hover:border-white/20'
                  }`}>
                  <ThumbsUp className="w-4 h-4" />
                  <span className="tabular-nums">{post.upvotes}</span>
                </button>
                <button onClick={handleDownvote} disabled={downvoting || !token}
                  title={!token ? t('post.login_vote') : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    post.my_downvote
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'text-white/40 border-border hover:text-white/70 hover:border-white/20'
                  }`}>
                  <ThumbsDown className="w-4 h-4" />
                  {(post.downvotes ?? 0) > 0 && <span className="tabular-nums">{post.downvotes}</span>}
                </button>
                {showTranslateBtn && (
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-accent/70 transition-colors disabled:opacity-40"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {translating ? t('post.translating') : translated ? t('post.show_original') : t('post.translate')}
                  </button>
                )}
                {/* 신고 버튼 (본인 게시글 제외) */}
                {token && userId !== post.user_id && (
                  <button onClick={() => setReportTarget({ type: 'post', id: post.id })}
                    className="ml-auto flex items-center gap-1.5 text-[11px] text-white/20 hover:text-orange-400 transition-colors">
                    <Flag className="w-3.5 h-3.5" /> {t('report.btn')}
                  </button>
                )}
              </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-bold text-white">{t('community.comments')} {post.comment_count}</h2>
          </div>

          {/* 댓글 입력 */}
          <div className="px-5 py-4 border-b border-border">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-surface-2 rounded-lg border border-border">
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3" /> @{replyTo.name}
                </span>
                <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white/60 text-xs">
                  {t('comment.cancel')}
                </button>
              </div>
            )}
            {token ? (
              <div>
                {/* 이미지 미리보기 */}
                {commentImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {commentImages.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCommentImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center text-white text-[10px]">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Avatar url={avatarUrl} name={displayName || 'U'} size={7} />
                  <div className="flex-1 flex gap-2">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment() } }}
                      placeholder={replyTo ? `@${replyTo.name}...` : t('comment.placeholder')}
                      maxLength={500}
                      className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                    />
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center justify-center w-10 h-10 bg-surface-2 border border-border rounded-xl text-white/30 hover:text-white/60 hover:border-white/20 transition-all disabled:opacity-40">
                      {uploadingImage ? <span className="text-[10px]">...</span> : <ImagePlus className="w-4 h-4" />}
                    </button>
                    <button onClick={handleSubmitComment}
                      disabled={(!commentText.trim() && commentImages.length === 0) || submittingComment}
                      className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-xl px-3 transition-all">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center">
                <Link href="/login" className="text-accent hover:underline">{t('auth.signin')}</Link>
                {' '}{t('comment.login_required')}
              </p>
            )}
          </div>

          {/* 댓글 목록 */}
          <div className="px-5 divide-y divide-border">
            {comments.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-8">{t('comment.empty')}</p>
            ) : (
              topComments.map(c => (
                <div key={c.id}>
                  <CommentItem c={c} t={t}
                    onVote={handleCommentVote}
                    onDownvote={handleCommentDownvote}
                    onReply={(pid, name) => setReplyTo({ id: pid, name })}
                    onReport={(cid) => setReportTarget({ type: 'comment', id: cid })}
                    currentUserId={userId}
                    token={token}
                    onDelete={handleDeleteComment}
                  />
                  {childComments(c.id).map(child => (
                    <CommentItem key={child.id} c={child} depth={1} t={t}
                      onVote={handleCommentVote}
                      onDownvote={handleCommentDownvote}
                      onReply={(pid, name) => setReplyTo({ id: pid, name })}
                      onReport={(cid) => setReportTarget({ type: 'comment', id: cid })}
                      currentUserId={userId}
                      token={token}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── 신고 모달 ── */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setReportTarget(null); setReportReason(''); setReportDetail('') } }}>
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-5 shadow-2xl">
            {reportDone ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
                  <Check className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm font-semibold text-white">{t('report.done')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-white">{t('report.title')}</h3>
                  </div>
                  <button onClick={() => { setReportTarget(null); setReportReason(''); setReportDetail('') }}
                    className="text-white/30 hover:text-white/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 신고 유형 */}
                <p className="text-xs text-white/40 mb-2">{t('report.reason_label')}</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(['spam','hate','sexual','violence','privacy','false_info','other'] as const).map(r => (
                    <button key={r} onClick={() => setReportReason(r)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                        reportReason === r
                          ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                          : 'border-border text-white/50 hover:border-white/20 hover:text-white/70'
                      }`}>
                      {t(`report.reason.${r}`)}
                    </button>
                  ))}
                </div>

                {/* 신고 내용 */}
                <p className="text-xs text-white/40 mb-2">{t('report.detail_label')}</p>
                <textarea
                  value={reportDetail}
                  onChange={e => setReportDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={t('report.detail_placeholder')}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/25 outline-none focus:border-white/20 transition-colors resize-none mb-4"
                />

                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setReportTarget(null); setReportReason(''); setReportDetail('') }}
                    className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 border border-border hover:border-white/20 transition-all">
                    {t('comment.cancel')}
                  </button>
                  <button onClick={handleReport} disabled={!reportReason || submittingReport}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-all disabled:opacity-40">
                    {submittingReport ? '...' : t('report.submit')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
