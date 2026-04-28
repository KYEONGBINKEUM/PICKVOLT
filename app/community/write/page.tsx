'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { X, Plus, Search, ChevronLeft, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import RichEditor, { RichEditorHandle } from '@/components/RichEditor'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

type PostType = 'review' | 'forum' | 'compare' | 'free' | 'qa' | 'news'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

interface ProductResult {
  id: string
  name: string
  brand: string
  image_url: string | null
  price_usd: number | null
  performance_score: number | null
}

function ProductSearch({ onSelect, exclude, placeholder }: {
  onSelect: (p: ProductResult) => void; exclude: string[]; placeholder: string
}) {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState<ProductResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=8`)
        .then(r => r.json())
        .then(d => setResults((d.results ?? []).filter((p: ProductResult) => !exclude.includes(p.id))))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, exclude])

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none" />
        {loading && <Loader2 className="w-3 h-3 text-white/30 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-xl overflow-hidden z-10 shadow-2xl">
          {results.map(p => (
            <button key={p.id} onClick={() => { onSelect(p); setQ(''); setResults([]) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
              {p.image_url && (
                <div className="w-10 h-10 rounded-lg bg-surface-2 flex-shrink-0 overflow-hidden relative">
                  <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate">{p.name}</p>
                <p className="text-[10px] text-white/30">{p.brand}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                {p.price_usd != null && <p className="text-[10px] text-white/40">${p.price_usd.toLocaleString()}</p>}
                {p.performance_score != null && p.performance_score > 0 && (
                  <p className="text-[10px] text-accent/70 font-bold">{Math.round(p.performance_score)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


function WritePageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t }        = useI18n()
  const defaultType  = (searchParams.get('type') as PostType) ?? 'forum'

  const [type, setType]         = useState<PostType>(defaultType)
  const [category, setCategory] = useState('laptop')
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [rating, setRating]     = useState(8)
  const [products, setProducts] = useState<ProductResult[]>([])
  const [options, setOptions]   = useState([
    { label: '', product_id: null as string | null, image_url: null as string | null },
    { label: '', product_id: null as string | null, image_url: null as string | null },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [token, setToken]           = useState<string | null>(null)
  const [authed, setAuthed]         = useState<boolean | null>(null)
  const editPostId = searchParams.get('edit')
  const [editLoaded, setEditLoaded] = useState(!searchParams.get('edit'))
  const [isAdmin, setIsAdmin]             = useState(false)
  const [displayName, setDisplayName]     = useState('')
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null)
  const [hoverStar, setHoverStar]         = useState(0)
  const [hasCompare, setHasCompare]       = useState(false)
  const [embeddedProducts, setEmbeddedProducts] = useState<ProductResult[]>([])
  const [showEmbedSearch, setShowEmbedSearch]   = useState(false)

  const CATEGORIES = [
    { key: 'laptop', label: t('cat.laptop') },
    { key: 'mobile', label: t('cat.mobile') },
    { key: 'tablet', label: t('cat.tablet') },
    { key: 'other',  label: t('cat.other') },
  ]

  const BASE_TYPES: { key: PostType; label: string; desc: string }[] = [
    { key: 'forum',   label: t('community.forum'),   desc: t('write.type.forum.desc') },
    { key: 'review',  label: t('community.reviews'), desc: t('write.type.review.desc') },
    { key: 'free',    label: t('community.free'),    desc: t('write.type.free.desc') },
    { key: 'qa',      label: t('community.qa'),      desc: t('write.type.qa.desc') },
  ]
  const TYPE_OPTIONS = isAdmin
    ? [...BASE_TYPES, { key: 'news' as PostType, label: t('community.news'), desc: t('write.type.news.desc') }]
    : BASE_TYPES

  const editorRef     = useRef<HTMLDivElement | null>(null)
  const richEditorRef = useRef<RichEditorHandle>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const session = sessionData.session
      setToken(session?.access_token ?? null)

      // getUser()로 서버에서 최신 이메일 확인 (getSession은 캐시 기반)
      const { data: { user } } = await supabase.auth.getUser()
      setAuthed(!!user)
      const email = (user?.email ?? '').toLowerCase()
      const admin = ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS.includes(email) : false
      console.log('[write] user email:', user?.email, 'isAdmin:', admin)
      setIsAdmin(admin)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('nickname, avatar_url').eq('user_id', user.id).maybeSingle()
        setDisplayName(profile?.nickname ?? user.email?.split('@')[0] ?? 'user')
        setAvatarUrl(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null)
      }
    })
  }, [])

  // Fix: news type not in TYPE_OPTIONS until isAdmin resolves
  useEffect(() => {
    if (isAdmin && defaultType === 'news') setType('news')
  }, [isAdmin, defaultType])

  // Load existing post for edit mode
  useEffect(() => {
    if (!editPostId) return
    fetch(`/api/community/posts/${editPostId}`)
      .then(r => r.json())
      .then(post => {
        if (!post?.id) return
        setType(post.type as PostType)
        setTitle(post.title ?? '')
        setBody(post.body ?? '')
        if (post.rating != null) setRating(post.rating)
        if (post.category) setCategory(post.category)
        const linked = (post.community_post_products ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((pp: any) => pp.products).filter(Boolean)
        if (linked.length > 0) setProducts(linked)
        const opts = (post.community_compare_options ?? [])
        if (opts.length >= 2) {
          setHasCompare(true)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setOptions(opts.map((o: any) => ({ label: o.label ?? '', product_id: o.product_id ?? null, image_url: o.image_url ?? null })))
        }
        setEditLoaded(true)
      })
      .catch(() => { setEditLoaded(true) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPostId])

  const handleOpenProductPanel = useCallback(() => {
    setShowEmbedSearch(true)
  }, [])

  const handleEmbedProduct = useCallback((p: ProductResult) => {
    setEmbeddedProducts(prev => {
      if (prev.find(x => x.id === p.id) || prev.length >= 4) return prev
      const imgHtml = p.image_url
        ? `<img src="${p.image_url}" style="width:72px;height:72px;object-fit:contain;border-radius:10px;flex-shrink:0;display:block" />`
        : `<span style="width:72px;height:72px;border-radius:10px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:rgba(255,255,255,0.15);flex-shrink:0">${p.brand?.[0] ?? '?'}</span>`
      const scoreHtml = p.performance_score != null && p.performance_score > 0
        ? `<span style="display:inline-flex;align-items:center;gap:6px;margin-top:6px">` +
          `<span style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden;display:inline-block;min-width:60px">` +
          `<span style="display:block;height:100%;width:${Math.min(100, Math.round(p.performance_score / 20))}%;background:rgba(249,115,22,0.9)"></span></span>` +
          `<span style="font-size:11px;font-weight:700;color:rgba(249,115,22,0.9)">${Math.round(p.performance_score)}</span>` +
          `</span>`
        : ''
      const priceHtml = p.price_usd != null
        ? `<span style="display:block;font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px;font-weight:500">$${p.price_usd.toLocaleString()}</span>`
        : ''
      const cardHtml =
        `<a href="/product/${p.id}" contenteditable="false" style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:14px 16px;background:rgba(255,255,255,0.04);margin:6px 0;width:100%;box-sizing:border-box;text-decoration:none;cursor:pointer">` +
        imgHtml +
        `<span style="flex:1;min-width:0">` +
        `<span style="display:block;font-size:14px;font-weight:700;color:rgba(255,255,255,0.88);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</span>` +
        `<span style="display:block;font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">${p.brand}</span>` +
        priceHtml +
        scoreHtml +
        `</span></a>`
      richEditorRef.current?.insertHtml(cardHtml)
      return [...prev, p]
    })
    setShowEmbedSearch(false)
  }, [])

  const handleProductSelect = useCallback((p: ProductResult) => {
    if (type === 'review') {
      setProducts([p])
    } else {
      setProducts(prev => prev.length < 5 ? [...prev, p] : prev)
    }
  }, [type])

  useEffect(() => {
    if (type === 'review' && products.length > 1) {
      setProducts(prev => prev.slice(0, 1))
    }
  }, [type, products.length])

  const handleOptionProductSelect = useCallback((p: ProductResult, idx: number) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, label: o.label || p.name, product_id: p.id, image_url: p.image_url } : o))
    setProducts(prev => prev.find(x => x.id === p.id) ? prev : [...prev, p])
  }, [])

  const canSubmit = () => {
    if (!title.trim()) return false
    if (type === 'review' && !category) return false
    if (hasCompare && options.some(o => !o.label.trim())) return false
    return true
  }

  const handleSubmit = async () => {
    if (!token || !canSubmit()) return
    setSubmitting(true); setError('')
    try {
      // Cards are already embedded in the editor body; only append comparison table if 2+ products
      let appendHtml = ''
      if (embeddedProducts.length >= 2) {
        const cols = embeddedProducts.map(p =>
          `<td style="padding:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.08);vertical-align:top">` +
          (p.image_url ? `<img src="${p.image_url}" style="width:56px;height:56px;object-fit:contain;margin:0 auto 8px;display:block" />` : '') +
          `<div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.8)">${p.name}</div>` +
          `<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:3px">${p.brand}</div></td>`
        ).join('')
        appendHtml = `<br /><table style="width:100%;border-collapse:collapse;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;margin:12px 0"><tr>${cols}</tr></table>`
      }

      const finalBody = body.trim() + appendHtml

      if (editPostId) {
        // Edit mode — PATCH
        const res = await fetch(`/api/community/posts/${editPostId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: title.trim(),
            body: finalBody,
            rating: type === 'review' ? rating : null,
            category: type === 'review' ? category : null,
          }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? t('write.error_network')); return }
        router.push(`/community/posts/${editPostId}`)
      } else {
        // Create mode — POST
        const res = await fetch('/api/community/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type,
            category: type === 'review' ? category : null,
            title: title.trim(),
            body: finalBody,
            rating: type === 'review' ? rating : null,
            product_ids: products.map(p => p.id),
            compare_options: hasCompare ? options : undefined,
          }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? t('write.error_network')); return }
        router.push(`/community/posts/${json.id}`)
      }
    } catch {
      setError(t('write.error_network'))
    } finally {
      setSubmitting(false)
    }
  }

  const ratingLabel = (r: number) =>
    r >= 9 ? t('post.rating.excellent')
    : r >= 7 ? t('post.rating.good')
    : r >= 5 ? t('post.rating.average')
    : t('post.rating.poor')

  const bodyPlaceholder =
    type === 'review' ? t('write.placeholder.review')
    : type === 'qa'   ? t('write.placeholder.qa')
    : t('write.placeholder.forum')

  // Section label style
  const labelCls = 'text-xs font-bold text-white/40 mb-2 uppercase tracking-widest'

  if (authed === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <p className="text-white/40 text-sm">{t('write.login_required')}</p>
          <Link href="/login" className="bg-accent text-white text-sm font-bold px-6 py-2.5 rounded-xl">
            {t('auth.signin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[720px] mx-auto px-4 md:px-6 pt-24 pb-20">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/community" className="text-white/25 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-white">{editPostId ? t('post.edit') : t('write.heading')}</h1>
          <div className="ml-auto flex items-center gap-2">
            {avatarUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0">
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
              </div>
            ) : displayName ? (
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white/50">{displayName[0]?.toUpperCase()}</span>
              </div>
            ) : null}
            {displayName && <span className="text-sm text-white/40">{displayName}</span>}
          </div>
        </div>

        <div className="space-y-6">

          {/* 유형 선택 — 인증 확인 후 렌더 (isAdmin 확정 전에 잘못된 옵션 고정 방지) */}
          <div>
            <p className={labelCls}>{t('write.type')}</p>
            {authed === null ? (
              <div className="w-full h-12 bg-surface border border-border rounded-xl animate-pulse" />
            ) : (
              <select
                key={String(isAdmin)}
                value={type}
                onChange={e => setType(e.target.value as PostType)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-colors cursor-pointer"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label} — {opt.desc}</option>
                ))}
              </select>
            )}
          </div>

          {/* 카테고리 (리뷰만) */}
          {type === 'review' && (
            <div>
              <p className={labelCls}>{t('write.category')}</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      category === c.key
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface border-border text-white/40 hover:text-white/70'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div>
            <p className={labelCls}>{t('write.post_title')}</p>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              placeholder={t('write.placeholder.title')}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
          </div>

          {/* 본문 에디터 */}
          <div>
            <p className={labelCls}>{t('write.body')}</p>
            {!editLoaded ? (
              <div className="w-full h-48 bg-surface border border-border rounded-xl animate-pulse" />
            ) : (
              <RichEditor
                key={editPostId ?? 'new'}
                ref={richEditorRef}
                editorRef={editorRef}
                onChange={setBody}
                token={token}
                placeholder={bodyPlaceholder}
                uploadSizeError={t('write.img_size_error')}
                uploadFailText={t('write.img_upload_fail')}
                urlPrompt={t('write.toolbar.url')}
                onOpenProductPanel={handleOpenProductPanel}
                embedCount={embeddedProducts.length}
                maxEmbed={4}
                initialHtml={editPostId ? body : undefined}
              />
            )}

            {/* 제품 검색 패널 (툴바 버튼 클릭 시 표시) */}
            {showEmbedSearch && (
              <div className="mt-2 bg-surface-2 border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('write.insert_product')}</span>
                  <button type="button" onClick={() => setShowEmbedSearch(false)} className="text-white/25 hover:text-white/60 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ProductSearch
                  onSelect={handleEmbedProduct}
                  exclude={embeddedProducts.map(p => p.id)}
                  placeholder={t('write.product_search')}
                />
              </div>
            )}

            {/* 비교 미리보기 (2개 이상 삽입 시) */}
            {embeddedProducts.length >= 2 && (
              <div className="mt-2 bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('write.compare_preview')}</span>
                </div>
                <div className="flex divide-x divide-border">
                  {embeddedProducts.map(p => (
                    <div key={p.id} className="flex-1 p-3 text-center min-w-0">
                      {p.image_url && (
                        <div className="w-10 h-10 mx-auto mb-1.5 relative">
                          <Image src={p.image_url} alt={p.name} fill className="object-contain" unoptimized />
                        </div>
                      )}
                      <p className="text-[11px] font-semibold text-white/70 line-clamp-2">{p.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 비교투표 토글 */}
          <div>
            <button
              type="button"
              onClick={() => setHasCompare(v => !v)}
              className={`w-full py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                hasCompare
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border text-white/30 hover:border-white/20 hover:text-white/50'
              }`}
            >
              {hasCompare ? t('write.remove_compare') : t('write.add_compare')}
            </button>

            {hasCompare && (
              <div className="mt-3 space-y-3">
                {options.map((opt, i) => (
                  <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-black text-white/50">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <p className="text-xs text-white/40">
                        {t('write.option_label').replace('{n}', String(i + 1))}
                      </p>
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
                          className="ml-auto text-white/20 hover:text-white/50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input value={opt.label}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, label: e.target.value } : o))}
                      placeholder={t('write.option_name').replace('{n}', String(i + 1))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
                    <ProductSearch
                      onSelect={p => handleOptionProductSelect(p, i)}
                      exclude={options.map(o => o.product_id).filter(Boolean) as string[]}
                      placeholder={t('write.product_search')}
                    />
                    {opt.product_id && <p className="text-[10px] text-accent/70">{t('write.product_linked')}</p>}
                  </div>
                ))}
                {options.length < 4 && (
                  <button type="button" onClick={() => setOptions(p => [...p, { label: '', product_id: null, image_url: null }])}
                    className="w-full py-3 border border-dashed border-border rounded-xl text-xs text-white/25 hover:text-white/50 hover:border-white/15 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> {t('write.add_option')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 평점 (리뷰만) */}
          {type === 'review' && (
            <div>
              <p className={labelCls}>{t('write.rating')}</p>
              <div className="bg-surface border border-border rounded-xl p-5">
                <div
                  className="flex items-center gap-1.5 mb-4"
                  onMouseLeave={() => setHoverStar(0)}
                >
                  {[1, 2, 3, 4, 5].map(star => {
                    const filled = (hoverStar || Math.round(rating / 2)) >= star
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star * 2)}
                        onMouseEnter={() => setHoverStar(star)}
                        className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                      >
                        <svg
                          width="36" height="36" viewBox="0 0 24 24"
                          fill={filled ? 'currentColor' : 'none'}
                          stroke="currentColor" strokeWidth="1.5"
                          className={`transition-colors ${filled ? 'text-amber-400' : 'text-white/15'}`}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{rating}</span>
                  <span className="text-sm text-white/25">/10</span>
                  <span className="text-sm text-white/40 ml-1">{ratingLabel(rating)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 제품 태그 */}
          <div>
            <p className={labelCls}>
              {t('write.product_tag')}
              <span className="text-white/20 normal-case font-normal ml-1">({t('write.optional')})</span>
            </p>
            {products.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-2.5 py-1">
                    <span className="text-xs text-white/55 truncate max-w-[160px]">{p.name}</span>
                    <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))}
                      className="text-white/25 hover:text-white/60 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {products.length < (type === 'review' ? 1 : 5) && (
              <ProductSearch
                onSelect={handleProductSelect}
                exclude={products.map(p => p.id)}
                placeholder={t('write.product_search')}
              />
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/community"
              className="px-6 py-3 rounded-xl border border-border text-white/35 text-sm hover:text-white/70 hover:border-white/15 transition-colors">
              {t('write.cancel')}
            </Link>
            <button onClick={handleSubmit} disabled={submitting || !canSubmit() || authed === null}
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold text-sm transition-all">
              {submitting ? t('write.submitting') : t('write.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WritePage() {
  return (
    <Suspense>
      <WritePageInner />
    </Suspense>
  )
}
