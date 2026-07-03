'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { X, Search, ChevronLeft, Loader2, Languages, RotateCcw } from 'lucide-react'
import Navbar from '@/components/Navbar'
import RichEditor, { RichEditorHandle } from '@/components/RichEditor'
import AiBotPostPanel from '@/components/AiBotPostPanel'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { BLOG_CATEGORIES } from '@/lib/blogCategories'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

interface ProductResult {
  id: string
  name: string
  brand: string
  image_url: string | null
  price_usd: number | null
  performance_score: number | null
  cpu_name: string | null
  gpu_name: string | null
  ram_gb: string | null
  os: string | null
  launch_year: number | null
  display_inch: number | null
  display_hz: number | null
  display_res: string | null
  battery: string | null
  weight: string | null
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


function mapApiError(code: string | undefined, t: (k: string) => string): string {
  const map: Record<string, string> = {
    too_many_posts:      'write.error_too_many_posts',
    duplicate_post:      'write.error_duplicate_post',
    too_many_comments:   'write.error_too_many_comments',
    duplicate_comment:   'write.error_duplicate_comment',
  }
  if (!code) return ''
  return map[code] ? t(map[code]) : code
}

function WritePageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t }        = useI18n()

  const [category, setCategory] = useState(BLOG_CATEGORIES.find(c => c.slug === 'mobile')?.slug ?? BLOG_CATEGORIES[0].slug)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [products, setProducts] = useState<ProductResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [token, setToken]           = useState<string | null>(null)
  const [authed, setAuthed]         = useState<boolean | null>(null)
  const editPostId = searchParams.get('edit')
  const [editLoaded, setEditLoaded] = useState(!searchParams.get('edit'))
  const [displayName, setDisplayName]     = useState('')
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null)
  const [embeddedProducts, setEmbeddedProducts] = useState<ProductResult[]>([])
  const [showEmbedSearch, setShowEmbedSearch]   = useState(false)
  const [aiCommentsEnabled, setAiCommentsEnabled] = useState(true)
  const [myPoints, setMyPoints]                   = useState(0)
  const [botPostCost, setBotPostCost]             = useState(50)
  const [translateLang, setTranslateLang]         = useState('en')
  const [translating, setTranslating]             = useState(false)
  const [originalTitle, setOriginalTitle]         = useState<string | null>(null)
  const [originalBody, setOriginalBody]           = useState<string | null>(null)


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

      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('nickname, avatar_url, points').eq('user_id', user.id).maybeSingle()
        setDisplayName(profile?.nickname ?? user.email?.split('@')[0] ?? 'user')
        setAvatarUrl(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null)
        setMyPoints((profile as { points?: number } | null)?.points ?? 0)

        // AI 봇 포인트 비용 조회
        fetch('/api/ai-bot/costs').then(r => r.ok ? r.json() : null).then(d => {
          if (d?.postPoints !== undefined) setBotPostCost(d.postPoints)
        }).catch(() => {})
      }
    })
  }, [])

  // Load existing post for edit mode
  useEffect(() => {
    if (!editPostId) return
    fetch(`/api/community/posts/${editPostId}`)
      .then(r => r.json())
      .then(post => {
        if (!post?.id) return
        setTitle(post.title ?? '')
        setBody(post.body ?? '')
        if (post.category) setCategory(post.category)
        const linked = (post.community_post_products ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((pp: any) => pp.products).filter(Boolean)
        if (linked.length > 0) setProducts(linked)
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
        ? `<div style="display:flex;align-items:center;gap:8px;margin-top:7px;width:100%">` +
          `<div style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden">` +
          `<div style="height:100%;width:${Math.min(100, Math.round(p.performance_score))}%;background:rgba(255,77,0,0.9);border-radius:2px"></div></div>` +
          `<span style="font-size:11px;font-weight:700;color:rgba(255,77,0,0.9);white-space:nowrap">${Math.round(p.performance_score * 10)}</span>` +
          `</div>`
        : ''
      const priceHtml = p.price_usd != null
        ? `<span style="display:block;font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px;font-weight:500">$${p.price_usd.toLocaleString()}</span>`
        : ''
      const cardHtml =
        `<div contenteditable="false" data-product-card="true" draggable="true" style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:14px 16px;background:rgba(255,255,255,0.04);margin:6px 0;width:100%;box-sizing:border-box;position:relative;cursor:grab">` +
        imgHtml +
        `<div style="flex:1;min-width:0">` +
        `<span style="display:block;font-size:14px;font-weight:700;color:rgba(255,255,255,0.88);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</span>` +
        `<span style="display:block;font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">${p.brand}</span>` +
        priceHtml +
        scoreHtml +
        `</div>` +
        `<span data-delete-card="true" style="position:absolute;top:8px;right:10px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:12px;color:rgba(255,255,255,0.4);cursor:pointer;line-height:1;flex-shrink:0" title="삭제">×</span>` +
        `</div><br />`
      richEditorRef.current?.insertHtml(cardHtml)
      return [...prev, p]
    })
    // Auto-add to product tags when embedding a card
    setProducts(prev => prev.find(x => x.id === p.id) ? prev : [...prev, p].slice(0, 5))
    setShowEmbedSearch(false)
  }, [])

  const handleProductSelect = useCallback((p: ProductResult) => {
    setProducts(prev => prev.length < 5 ? [...prev, p] : prev)
  }, [])

  const TRANSLATE_LANGS = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'zh-CN', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
  ]

  const handleTranslate = async () => {
    const curTitle = title
    const curHtml  = editorRef.current?.innerHTML ?? body
    if (!curTitle.trim() && !curHtml.trim()) return

    // save originals for restore
    setOriginalTitle(curTitle)
    setOriginalBody(curHtml)
    setTranslating(true)

    try {
      const doTranslate = (q: string) =>
        fetch(`/api/translate?q=${encodeURIComponent(q)}&tl=${translateLang}`)
          .then(r => r.json())
          .then(d => (d.text ?? q) as string)

      // ── 본문: img / product-card / compare-table 을 플레이스홀더로 보존 ──
      const temp = document.createElement('div')
      temp.innerHTML = curHtml

      const preserved: string[] = []
      temp.querySelectorAll('[data-product-card], [data-compare-table], img').forEach(el => {
        const ph = `PVPH${preserved.length}END`
        preserved.push(el.outerHTML)
        el.replaceWith(document.createTextNode(ph))
      })

      // <br> → 줄바꿈 문자, 나머지 태그 제거 후 plain text 추출
      temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
      const plainText = temp.textContent ?? ''

      const [newTitle, newText] = await Promise.all([
        curTitle.trim() ? doTranslate(curTitle) : Promise.resolve(curTitle),
        plainText.trim() ? doTranslate(plainText) : Promise.resolve(plainText),
      ])

      setTitle(newTitle)

      if (editorRef.current) {
        // 줄바꿈 → <br>, 플레이스홀더 원복
        let result = newText.replace(/\n/g, '<br>')
        preserved.forEach((html, i) => {
          result = result.replace(new RegExp(`PVPH${i}END`, 'g'), html)
        })
        editorRef.current.innerHTML = result
        setBody(editorRef.current.innerHTML)
      }
    } catch {
      // leave content unchanged on error
    } finally {
      setTranslating(false)
    }
  }

  const handleRestoreOriginal = () => {
    if (originalTitle !== null) setTitle(originalTitle)
    if (originalBody !== null && editorRef.current) {
      editorRef.current.innerHTML = originalBody
      setBody(originalBody)
    }
    setOriginalTitle(null)
    setOriginalBody(null)
  }

  const canSubmit = () => title.trim().length > 0

  const handleSubmit = async () => {
    if (!token || !canSubmit()) return
    setSubmitting(true); setError('')
    try {
      const finalBody = body.trim()

      if (editPostId) {
        // Edit mode — PATCH
        const res = await fetch(`/api/community/posts/${editPostId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: title.trim(),
            body: finalBody,
            rating: null,
            category,
            product_ids: products.map(p => p.id),
          }),
        })
        const json = await res.json()
        if (!res.ok) { setError(mapApiError(json.error, t) ?? t('write.error_network')); return }
        router.push(`/community/posts/${editPostId}`)
      } else {
        // Create mode — POST
        const res = await fetch('/api/community/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: 'news',
            category,
            title: title.trim(),
            body: finalBody,
            rating: null,
            product_ids: products.map(p => p.id),
            ai_comments_enabled: aiCommentsEnabled,
          }),
        })
        const json = await res.json()
        if (!res.ok) { setError(mapApiError(json.error, t) ?? t('write.error_network')); return }
        router.refresh()  // invalidate community feed cache so new post appears immediately
        router.push(`/community/posts/${json.id}`)
      }
    } catch {
      setError(t('write.error_network'))
    } finally {
      setSubmitting(false)
    }
  }

  const bodyPlaceholder = t('write.placeholder.forum')

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

          {/* 카테고리 선택 */}
          <div>
            <p className={labelCls}>{t('write.category')}</p>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-colors"
            >
              {BLOG_CATEGORIES.map(c => (
                <option key={c.slug} value={c.slug}>{t(c.labelKey)}</option>
              ))}
            </select>
          </div>

          {/* AI 봇 댓글 허용 */}
          {!editPostId && (
            <div>
              <p className={labelCls}>{t('ai_bot.allow_comments')}</p>
              <div className="flex gap-2">
                {([true, false] as const).map(on => (
                  <button
                    key={String(on)}
                    type="button"
                    onClick={() => setAiCommentsEnabled(on)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      aiCommentsEnabled === on
                        ? on ? 'border-accent bg-accent/15 text-white' : 'border-red-500/40 bg-red-500/10 text-red-400'
                        : 'border-border text-white/30 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    {on ? t('ai_bot.yes') : t('ai_bot.no')}
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

          {/* 번역 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Languages className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span className="text-xs text-white/30">{t('write.translate_to')}</span>
            <select
              value={translateLang}
              onChange={e => setTranslateLang(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/20 transition-colors"
            >
              {TRANSLATE_LANGS.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating || (!title.trim() && !body.trim())}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/6 border border-border text-xs font-semibold text-white/60 hover:text-white hover:border-white/20 disabled:opacity-40 transition-all"
            >
              {translating
                ? <><Loader2 className="w-3 h-3 animate-spin" />{t('write.translating')}</>
                : t('write.translate_btn')
              }
            </button>
            {originalTitle !== null && (
              <button
                type="button"
                onClick={handleRestoreOriginal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                {t('write.restore_original')}
              </button>
            )}
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

          </div>

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
            {products.length < 5 && (
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

          {/* AI 봇 글쓰기 패널 */}
          {token && !editPostId && (
            <AiBotPostPanel
              token={token}
              clanId={null}
              userPoints={myPoints}
              botPostCost={botPostCost}
              category={category}
            />
          )}
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
