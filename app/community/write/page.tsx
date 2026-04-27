'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  X, Plus, Search, Bold, Italic, Quote, List, Link2,
  ChevronLeft, ImageIcon, Loader2,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

type PostType = 'review' | 'forum' | 'compare' | 'free' | 'qa' | 'news'

const ADMIN_EMAIL = 'admin@djcjbch.org'

interface ProductResult { id: string; name: string; brand: string; image_url: string | null }

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
                <div className="w-8 h-8 rounded-lg bg-surface-2 flex-shrink-0 overflow-hidden relative">
                  <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate">{p.name}</p>
                <p className="text-[10px] text-white/30">{p.brand}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RichEditor({ editorRef, onChange, token, placeholder, uploadSizeError, uploadFailText, urlPrompt }: {
  editorRef: React.MutableRefObject<HTMLDivElement | null>
  onChange: (html: string) => void
  token: string | null
  placeholder: string
  uploadSizeError: string
  uploadFailText: string
  urlPrompt: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  const insertHtml = (html: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      const el = editorRef.current
      if (!el) return
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    document.execCommand('insertHTML', false, html)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    if (file.size > 10 * 1024 * 1024) { alert(uploadSizeError); return }
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('community-images').upload(path, file, { upsert: false })
      if (error) { alert(uploadFailText + error.message); return }
      const { data } = supabase.storage.from('community-images').getPublicUrl(path)
      insertHtml(`<img src="${data.publicUrl}" style="max-width:100%;border-radius:10px;margin:6px 0;display:block;border:1px solid rgba(255,255,255,0.08)" /><br />`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tools = [
    { icon: Bold,   title: 'B',   action: () => exec('bold') },
    { icon: Italic, title: 'I',   action: () => exec('italic') },
    { icon: List,   title: '•',   action: () => exec('insertUnorderedList') },
    { icon: Quote,  title: '"',   action: () => insertHtml('<blockquote style="border-left:2px solid rgba(255,255,255,0.2);padding-left:12px;color:rgba(255,255,255,0.45);margin:4px 0">Quote</blockquote><br />') },
    { icon: Link2,  title: '🔗',  action: () => {
      const url = prompt(urlPrompt)
      if (url) exec('createLink', url)
    }},
  ]

  return (
    <div className="border border-border rounded-xl overflow-hidden focus-within:border-white/20 transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-black/20 border-b border-border">
        {tools.map(({ icon: Icon, title, action }) => (
          <button key={title} type="button" onMouseDown={e => { e.preventDefault(); action() }}
            className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors">
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button"
          onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click() }}
          disabled={uploading}
          className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
      <div
        ref={el => { editorRef.current = el }}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        data-placeholder={placeholder}
        className="min-h-[280px] px-4 py-3 text-sm text-white/85 leading-relaxed outline-none bg-surface empty:before:content-[attr(data-placeholder)] empty:before:text-white/20"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      />
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
  const [isAdmin, setIsAdmin]       = useState(false)
  const [hoverStar, setHoverStar]   = useState(0)
  const [hasCompare, setHasCompare] = useState(false)

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

  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
      setAuthed(!!data.session?.user)
      setIsAdmin(data.session?.user?.email === ADMIN_EMAIL)
    })
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
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          category: type === 'review' ? category : null,
          title: title.trim(),
          body: body.trim(),
          rating: type === 'review' ? rating : null,
          product_ids: products.map(p => p.id),
          compare_options: hasCompare ? options : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? t('write.error_network')); return }
      router.push(`/community/posts/${json.id}`)
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
          <h1 className="text-xl font-black text-white">{t('write.heading')}</h1>
        </div>

        <div className="space-y-6">

          {/* 유형 선택 — select */}
          <div>
            <p className={labelCls}>{t('write.type')}</p>
            <select
              value={type}
              onChange={e => setType(e.target.value as PostType)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-colors cursor-pointer"
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label} — {opt.desc}</option>
              ))}
            </select>
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
            <RichEditor
              editorRef={editorRef}
              onChange={setBody}
              token={token}
              placeholder={bodyPlaceholder}
              uploadSizeError={t('write.img_size_error')}
              uploadFailText={t('write.img_upload_fail')}
              urlPrompt={t('write.toolbar.url')}
            />
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
