'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  X, Plus, Search, Bold, Italic, Quote, Code, List, Link2,
  ChevronLeft, ImageIcon, Loader2,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

type PostType = 'review' | 'forum' | 'compare'

const CATEGORIES = [
  { key: 'laptop', label: '랩탑' },
  { key: 'mobile', label: '모바일' },
  { key: 'tablet', label: '태블릿' },
  { key: 'other',  label: '기타' },
]

const TYPE_OPTIONS: { key: PostType; label: string; desc: string }[] = [
  { key: 'forum',   label: '포럼',    desc: '자유로운 정보 공유 및 질문' },
  { key: 'review',  label: '리뷰',    desc: '제품 사용 후기 작성' },
  { key: 'compare', label: '비교투표', desc: '제품 A/B 비교 투표 만들기' },
]

interface ProductResult { id: string; name: string; brand: string; image_url: string | null }

function ProductSearch({ onSelect, exclude }: { onSelect: (p: ProductResult) => void; exclude: string[] }) {
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
          placeholder="제품 검색 (선택사항)"
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

function EditorToolbar({ textareaRef, onChange, token }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onChange: (val: string) => void
  token: string | null
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const wrap = (before: string, after = before, placeholder = '텍스트') => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const sel   = el.value.slice(start, end) || placeholder
    const newVal = el.value.slice(0, start) + before + sel + after + el.value.slice(end)
    onChange(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + sel.length) }, 0)
  }

  const linePrefix = (prefix: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = el.value.lastIndexOf('\n', start - 1) + 1
    const newVal = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart)
    onChange(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length) }, 0)
  }

  const insertText = (text: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const newVal = el.value.slice(0, start) + text + el.value.slice(start)
    onChange(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length) }, 0)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    if (file.size > 10 * 1024 * 1024) { alert('10MB 이하 이미지만 업로드할 수 있습니다'); return }

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('community-images')
        .upload(path, file, { upsert: false })
      if (error) { alert('이미지 업로드 실패: ' + error.message); return }

      const { data } = supabase.storage.from('community-images').getPublicUrl(path)
      insertText(`![이미지](${data.publicUrl})\n`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tools = [
    { icon: Bold,   title: '굵게',   action: () => wrap('**', '**', '굵은 텍스트') },
    { icon: Italic, title: '기울임', action: () => wrap('_', '_', '기울임 텍스트') },
    { icon: Quote,  title: '인용',   action: () => linePrefix('> ') },
    { icon: Code,   title: '코드',   action: () => wrap('`', '`', '코드') },
    { icon: List,   title: '목록',   action: () => linePrefix('- ') },
    { icon: Link2,  title: '링크',   action: () => wrap('[', '](https://)', '링크 텍스트') },
  ]

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-black/20 border-b border-border rounded-t-xl">
      {tools.map(({ icon: Icon, title, action }) => (
        <button key={title} type="button" onClick={action} title={title}
          className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors">
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <div className="w-px h-4 bg-border mx-1" />
      {/* 이미지 업로드 */}
      <button type="button" title="이미지 첨부"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <span className="ml-auto text-[9px] text-white/20 pr-1">마크다운 지원</span>
    </div>
  )
}

function WritePageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const defaultType  = (searchParams.get('type') as PostType) ?? 'forum'

  const [type, setType]         = useState<PostType>(defaultType)
  const [category, setCategory] = useState('laptop')
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [rating, setRating]     = useState(7)
  const [products, setProducts] = useState<ProductResult[]>([])
  const [options, setOptions]   = useState([
    { label: '', product_id: null as string | null, image_url: null as string | null },
    { label: '', product_id: null as string | null, image_url: null as string | null },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [token, setToken]           = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null)
  const [authed, setAuthed]         = useState<boolean | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setToken(data.session?.access_token ?? null)
      setAuthed(!!u)
      if (u) {
        setDisplayName(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? '')
        setAvatarUrl(u.user_metadata?.avatar_url ?? null)
      }
    })
  }, [])

  const handleProductSelect = useCallback((p: ProductResult) => {
    setProducts(prev => prev.length < 5 ? [...prev, p] : prev)
  }, [])

  const handleOptionProductSelect = useCallback((p: ProductResult, idx: number) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, label: o.label || p.name, product_id: p.id, image_url: p.image_url } : o))
    setProducts(prev => prev.find(x => x.id === p.id) ? prev : [...prev, p])
  }, [])

  const canSubmit = () => {
    if (!title.trim()) return false
    if (type === 'review' && !category) return false
    if (type === 'compare' && options.some(o => !o.label.trim())) return false
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
          compare_options: type === 'compare' ? options : undefined,
          display_name: displayName,
          avatar_url: avatarUrl,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '오류가 발생했습니다'); return }
      router.push(`/community/posts/${json.id}`)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (authed === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <p className="text-white/40 text-sm">로그인이 필요합니다</p>
          <Link href="/login" className="bg-accent text-white text-sm font-bold px-6 py-2.5 rounded-xl">로그인</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[720px] mx-auto px-6 pt-24 pb-20">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/community" className="text-white/25 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-white">글 작성</h1>
        </div>

        <div className="space-y-6">

          {/* 유형 선택 */}
          <div>
            <p className="text-[10px] text-white/30 mb-2 font-semibold uppercase tracking-widest">유형</p>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`py-3 px-3 rounded-xl text-left transition-all border ${
                    type === t.key
                      ? 'bg-white/5 border-white/20'
                      : 'bg-surface border-border hover:border-white/10'
                  }`}>
                  <p className={`text-xs font-bold mb-0.5 ${type === t.key ? 'text-white' : 'text-white/50'}`}>{t.label}</p>
                  <p className="text-[10px] text-white/25 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 카테고리 (리뷰만) */}
          {type === 'review' && (
            <div>
              <p className="text-[10px] text-white/30 mb-2 font-semibold uppercase tracking-widest">카테고리</p>
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
            <p className="text-[10px] text-white/30 mb-2 font-semibold uppercase tracking-widest">제목</p>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              placeholder={type === 'compare' ? '예: 맥북 M5 vs 갤럭시북 5 어떤게 나아요?' : '제목을 입력하세요'}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
            <p className="text-[10px] text-white/20 text-right mt-1">{title.length} / 120</p>
          </div>

          {/* 비교투표 옵션 */}
          {type === 'compare' && (
            <div>
              <p className="text-[10px] text-white/30 mb-2 font-semibold uppercase tracking-widest">투표 항목</p>
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-black text-white/50">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <p className="text-xs text-white/40">{i + 1}번 항목</p>
                    </div>
                    <input value={opt.label}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, label: e.target.value } : o))}
                      placeholder={`항목 ${i + 1} 이름`}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
                    <ProductSearch
                      onSelect={p => handleOptionProductSelect(p, i)}
                      exclude={options.map(o => o.product_id).filter(Boolean) as string[]}
                    />
                    {opt.product_id && (
                      <p className="text-[10px] text-accent/70">제품 연결됨</p>
                    )}
                  </div>
                ))}
                {options.length < 4 && (
                  <button onClick={() => setOptions(p => [...p, { label: '', product_id: null, image_url: null }])}
                    className="w-full py-3 border border-dashed border-border rounded-xl text-xs text-white/25 hover:text-white/50 hover:border-white/15 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> 항목 추가 (최대 4개)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 본문 에디터 */}
          {type !== 'compare' && (
            <div>
              <p className="text-[10px] text-white/30 mb-2 font-semibold uppercase tracking-widest">본문</p>
              <div className="border border-border rounded-xl overflow-hidden focus-within:border-white/20 transition-colors">
                <EditorToolbar textareaRef={textareaRef} onChange={setBody} token={token} />
                <textarea ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
                  rows={12} maxLength={5000}
                  placeholder={
                    type === 'review'
                      ? '제품을 사용해본 솔직한 후기를 남겨주세요.\n\n장점:\n단점:\n총평:'
                      : '자유롭게 의견이나 정보를 공유해보세요.'
                  }
                  className="w-full bg-surface px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed" />
                {/* 업로드된 이미지 썸네일 미리보기 */}
                {(() => {
                  const imgs = [...body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].map(m => m[1])
                  if (imgs.length === 0) return null
                  return (
                    <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {imgs.map((url, i) => (
                        <div key={i} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-24 w-auto rounded-lg border border-border object-cover" />
                          <button
                            type="button"
                            onClick={() => setBody(b => b.replace(new RegExp(`!\\[[^\\]]*\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n?`), ''))}
                            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <p className="text-[10px] text-white/20 text-right mt-1">{body.length} / 5000</p>
            </div>
          )}

          {/* 평점 (리뷰만) */}
          {type === 'review' && (
            <div>
              <p className="text-[10px] text-white/30 mb-2 font-semibold uppercase tracking-widest">평점</p>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setRating(n)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                        rating === n
                          ? 'bg-accent border-accent text-white'
                          : rating > n
                          ? 'bg-accent/15 border-accent/20 text-accent/70'
                          : 'bg-white/5 border-border text-white/25 hover:bg-white/8'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-accent">{rating}</span>
                  <span className="text-sm text-white/25">/10</span>
                  <span className="text-xs text-white/35 ml-1">
                    {rating >= 9 ? '완벽해요' : rating >= 7 ? '좋아요' : rating >= 5 ? '보통이에요' : '아쉬워요'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 제품 태그 */}
          {type !== 'compare' && (
            <div>
              <p className="text-[10px] text-white/30 mb-1 font-semibold uppercase tracking-widest">
                제품 태그 <span className="text-white/15 normal-case font-normal">(선택)</span>
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
                <ProductSearch onSelect={handleProductSelect} exclude={products.map(p => p.id)} />
              )}
            </div>
          )}

          {/* 에러 */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <Link href="/community"
              className="px-6 py-3 rounded-xl border border-border text-white/35 text-sm hover:text-white/70 hover:border-white/15 transition-colors">
              취소
            </Link>
            <button onClick={handleSubmit} disabled={submitting || !canSubmit() || authed === null}
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold text-sm transition-all">
              {submitting ? '등록 중...' : '게시하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WritePage() {
  return <Suspense><WritePageInner /></Suspense>
}
