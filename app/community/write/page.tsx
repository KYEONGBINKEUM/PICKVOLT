'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { X, Plus, Search, ChevronLeft, Loader2, ChevronDown, Check, Languages, RotateCcw } from 'lucide-react'
import Navbar from '@/components/Navbar'
import RichEditor, { RichEditorHandle } from '@/components/RichEditor'
import AiBotPostPanel from '@/components/AiBotPostPanel'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

type PostType = 'forum' | 'news'

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


interface ClanItem { id: string; slug: string; name: string; avatar_url: string | null }

function ClanDropdown({
  clans, selectedId, onSelect,
  isMembersOnly, onToggleMembersOnly,
  labelCls, t,
}: {
  clans: ClanItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  isMembersOnly: boolean
  onToggleMembersOnly: () => void
  labelCls: string
  t: (k: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')
  const wrapRef         = useRef<HTMLDivElement>(null)

  const selected = clans.find(c => c.id === selectedId) ?? null
  const filtered = q.trim()
    ? clans.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.toLowerCase().includes(q.toLowerCase()))
    : clans

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQ('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const choose = (id: string | null) => { onSelect(id); setOpen(false); setQ('') }

  return (
    <div>
      <p className={labelCls}>{t('clan.post_in')}</p>
      <div ref={wrapRef} className="relative">
        {/* 트리거 버튼 */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-white transition-colors hover:border-white/20 focus:border-white/20"
        >
          {selected ? (
            <>
              {selected.avatar_url ? (
                <div className="w-7 h-7 rounded-lg overflow-hidden relative flex-shrink-0">
                  <Image src={selected.avatar_url} alt={selected.name} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-black text-white/40">{selected.name[0]?.toUpperCase()}</span>
                </div>
              )}
              <span className="flex-1 text-left text-white/85 truncate">{selected.name}</span>
              <span className="text-[10px] text-white/30 flex-shrink-0">c/{selected.slug}</span>
            </>
          ) : (
            <span className="flex-1 text-left text-white/30">{t('clan.none')}</span>
          )}
          <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* 드롭다운 패널 */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-xl overflow-hidden z-20 shadow-2xl">
            {/* 검색 */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t('clan.search')}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="text-white/25 hover:text-white/60 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 옵션 목록 */}
            <div className="max-h-56 overflow-y-auto">
              {/* 없음 옵션 */}
              <button
                type="button"
                onClick={() => choose(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-border flex items-center justify-center flex-shrink-0">
                  <X className="w-3 h-3 text-white/25" />
                </div>
                <span className="flex-1 text-left text-sm text-white/40">{t('clan.none')}</span>
                {selectedId === null && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
              </button>

              {filtered.length === 0 && q && (
                <div className="px-4 py-3 text-xs text-white/25 text-center">{q} — 결과 없음</div>
              )}

              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => choose(c.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  {c.avatar_url ? (
                    <div className="w-7 h-7 rounded-lg overflow-hidden relative flex-shrink-0">
                      <Image src={c.avatar_url} alt={c.name} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-black text-white/40">{c.name[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="flex-1 text-left text-sm text-white/85 truncate">{c.name}</span>
                  <span className="text-[10px] text-white/30 flex-shrink-0">c/{c.slug}</span>
                  {selectedId === c.id && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 멤버 전용 토글 */}
      {selectedId && (
        <button
          type="button"
          onClick={onToggleMembersOnly}
          className={`mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isMembersOnly
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border text-white/30 hover:border-white/20 hover:text-white/60'
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${isMembersOnly ? 'border-accent bg-accent' : 'border-white/30'}`}>
            {isMembersOnly && <span className="text-white text-[8px] font-black">✓</span>}
          </span>
          {t('clan.members_only_toggle')}
        </button>
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
  const [myClans, setMyClans]             = useState<{ id: string; slug: string; name: string; avatar_url: string | null }[]>([])
  const [selectedClanId, setSelectedClanId]   = useState<string | null>(null)
  const [isMembersOnly, setIsMembersOnly]     = useState(false)
  const [pointPriceEnabled, setPointPriceEnabled] = useState(false)
  const [aiCommentsEnabled, setAiCommentsEnabled] = useState(true)
  const [pointPrice, setPointPrice]               = useState(0)
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
      setIsAdmin(admin)

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

        // Load user's clans
        if (session?.access_token) {
          const clanSlugParam = new URLSearchParams(window.location.search).get('clan')
          fetch('/api/clans?my=1', { headers: { Authorization: `Bearer ${session.access_token}` } })
            .then(r => r.json())
            .then(d => {
              const list = (d.clans ?? []).map((c: { id: string; slug: string; name: string; avatar_url?: string | null }) => ({ id: c.id, slug: c.slug, name: c.name, avatar_url: c.avatar_url ?? null }))
              setMyClans(list)
              if (clanSlugParam) {
                const matched = list.find((c: { slug: string }) => c.slug === clanSlugParam)
                if (matched) setSelectedClanId(matched.id)
              }
            })
            .catch(() => {})
        }
      }
    })
  }, [])

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
        `<a href="/product/${p.id}" style="display:block;font-size:14px;font-weight:700;color:rgba(255,255,255,0.88);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none">${p.name}</a>` +
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

  const handleOptionProductSelect = useCallback((p: ProductResult, idx: number) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, label: o.label || p.name, product_id: p.id, image_url: p.image_url } : o))
    setProducts(prev => prev.find(x => x.id === p.id) ? prev : [...prev, p])
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

  const canSubmit = () => {
    if (!title.trim()) return false
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
        // 헤더 행 (이미지 + 이름 + 가격)
        const n = embeddedProducts.length
        const sep = (i: number) => i < n - 1 ? 'border-right:1px solid rgba(255,255,255,0.08);' : ''
        const headerCols = embeddedProducts.map((p, i) =>
          `<td style="padding:12px 10px;text-align:center;${sep(i)}vertical-align:top;background:rgba(255,255,255,0.03)">` +
          (p.image_url ? `<img src="${p.image_url}" style="width:56px;height:56px;object-fit:contain;margin:0 auto 6px;display:block" />` : '') +
          `<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);word-break:break-word;line-height:1.3">${p.name}</div>` +
          `<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px">${p.brand}</div>` +
          (p.price_usd != null ? `<div style="font-size:11px;color:rgba(255,77,0,0.9);font-weight:600;margin-top:3px">$${p.price_usd.toLocaleString()}</div>` : '') +
          `</td>`
        ).join('')

        // 스펙 행 생성 함수 (label은 번역된 문자열)
        const specRow = (label: string, values: (string | null)[]) => {
          if (!values.some(v => v != null)) return ''
          const cells = values.map((v, i) =>
            `<td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:600;color:${v ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.2)'};${sep(i)}word-break:break-word">` +
            (v ?? '—') + `</td>`
          ).join('')
          return `<tr style="border-top:1px solid rgba(255,255,255,0.06)">` +
            `<td style="padding:8px 10px;font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;white-space:nowrap;background:rgba(255,255,255,0.02)">${label}</td>` +
            cells + `</tr>`
        }

        // 점수 행 (게이지 포함)
        const scoreRow = () => {
          if (!embeddedProducts.some(p => p.performance_score != null)) return ''
          const cells = embeddedProducts.map((p, i) => {
            const s = p.performance_score != null ? Math.round(p.performance_score * 10) : null
            const bar = s != null
              ? `<div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:5px;overflow:hidden">` +
                `<div style="height:100%;width:${s / 10}%;background:rgba(255,77,0,0.85);border-radius:2px"></div></div>`
              : ''
            return `<td style="padding:8px 10px;text-align:center;${sep(i)}">` +
              `<span style="font-size:18px;font-weight:900;color:rgba(255,77,0,0.95)">${s ?? '—'}</span>` +
              (s != null ? `<span style="font-size:10px;color:rgba(255,255,255,0.25)"> /1000</span>` : '') +
              bar + `</td>`
          }).join('')
          return `<tr style="border-top:1px solid rgba(255,255,255,0.06)">` +
            `<td style="padding:8px 10px;font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;white-space:nowrap;background:rgba(255,255,255,0.02)">${t('compare.overall_score')}</td>` +
            cells + `</tr>`
        }

        const specsRows = [
          scoreRow(),
          specRow('CPU', embeddedProducts.map(p => p.cpu_name)),
          specRow('GPU', embeddedProducts.map(p => p.gpu_name)),
          specRow(t('spec.ram'), embeddedProducts.map(p => p.ram_gb != null ? `${p.ram_gb} GB` : null)),
          specRow(t('cat.spec_display'), embeddedProducts.map(p =>
            p.display_inch != null ? `${p.display_inch}"${p.display_hz ? ` ${p.display_hz}Hz` : ''}` : null
          )),
          specRow(t('spec.resolution'), embeddedProducts.map(p => p.display_res)),
          specRow(t('cat.spec_battery'), embeddedProducts.map(p => p.battery)),
          specRow(t('cat.spec_weight'), embeddedProducts.map(p => p.weight)),
          specRow('OS', embeddedProducts.map(p => p.os)),
          specRow(t('compare.launch_year'), embeddedProducts.map(p => p.launch_year != null ? String(p.launch_year) : null)),
        ].join('')

        const productColWidth = Math.max(140, Math.floor(300 / embeddedProducts.length))
        appendHtml =
          `<br /><div data-compare-table="true" style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:12px 0;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden"><table style="width:100%;min-width:${80 + embeddedProducts.length * productColWidth}px;border-collapse:collapse">` +
          `<colgroup><col style="width:80px;min-width:80px" />${embeddedProducts.map(() => `<col style="min-width:${productColWidth}px" />`).join('')}</colgroup>` +
          `<thead><tr><td style="padding:12px 10px;background:rgba(255,255,255,0.03)"></td>${headerCols}</tr></thead>` +
          `<tbody>${specsRows}</tbody></table></div>`
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
            rating: null,
            category: null,
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
            type,
            category: null,
            title: title.trim(),
            body: finalBody,
            rating: null,
            product_ids: products.map(p => p.id),
            compare_options: hasCompare ? options : undefined,
            clan_id: selectedClanId ?? null,
            is_members_only: selectedClanId ? isMembersOnly : false,
            point_price: pointPriceEnabled && pointPrice > 0 ? pointPrice : 0,
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

  const ratingLabel = (r: number) =>
    r >= 9 ? t('post.rating.excellent')
    : r >= 7 ? t('post.rating.good')
    : r >= 5 ? t('post.rating.average')
    : t('post.rating.poor')

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

          {/* 어드민 전용 뉴스 타입 토글 */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setType(t => t === 'news' ? 'forum' : 'news')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  type === 'news'
                    ? 'border-accent bg-accent/15 text-white'
                    : 'border-border text-white/30 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {t('community.news')}
              </button>
            </div>
          )}

          {/* 클랜 선택 */}
          {myClans.length > 0 && !editPostId && (
            <ClanDropdown
              clans={myClans}
              selectedId={selectedClanId}
              onSelect={id => { setSelectedClanId(id); if (!id) setIsMembersOnly(false) }}
              isMembersOnly={isMembersOnly}
              onToggleMembersOnly={() => setIsMembersOnly(v => !v)}
              labelCls={labelCls}
              t={t}
            />
          )}

          {/* 포인트 열람가 */}
          {!editPostId && (
            <div>
              <p className={labelCls}>{t('write.point_price')}</p>
              <div className="flex gap-2">
                {([false, true] as const).map(on => (
                  <button
                    key={String(on)}
                    type="button"
                    onClick={() => { setPointPriceEnabled(on); if (!on) setPointPrice(0) }}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      pointPriceEnabled === on
                        ? on ? 'border-accent bg-accent/15 text-white' : 'border-white/30 bg-white/8 text-white'
                        : 'border-border text-white/30 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    {on ? t('write.point_price_on') : t('write.point_price_off')}
                  </button>
                ))}
              </div>
              {pointPriceEnabled && (
                <div className="mt-2 flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pointPrice === 0 ? '' : pointPrice}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '')
                      const v = raw === '' ? 0 : Math.max(1, Math.min(9999, parseInt(raw)))
                      setPointPrice(v)
                    }}
                    placeholder={t('write.point_price_ph')}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                  />
                  <span className="text-xs font-bold text-white/30 flex-shrink-0">pt</span>
                </div>
              )}
            </div>
          )}

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
              clanId={selectedClanId || null}
              userPoints={myPoints}
              botPostCost={botPostCost}
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
