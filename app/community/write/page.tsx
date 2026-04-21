'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, X, Plus, Search } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

type PostType = 'review' | 'forum' | 'compare'
const CATEGORIES = [{ key: 'laptop', label: '랩탑' }, { key: 'mobile', label: '모바일' }, { key: 'tablet', label: '태블릿' }, { key: 'other', label: '기타' }]

interface ProductResult { id: string; name: string; brand: string; image_url: string | null }

function ProductSearch({ onSelect, exclude }: { onSelect: (p: ProductResult) => void; exclude: string[] }) {
  const [q, setQ]           = useState('')
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
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="제품 검색 (선택사항)"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none" />
        {loading && <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-xl overflow-hidden z-10 shadow-xl">
          {results.map(p => (
            <button key={p.id} onClick={() => { onSelect(p); setQ(''); setResults([]) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
              {p.image_url && <div className="w-8 h-8 rounded-lg bg-surface flex-shrink-0 overflow-hidden relative"><Image src={p.image_url} alt={p.name} fill className="object-contain p-1" unoptimized /></div>}
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

function WritePageInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const defaultType = (searchParams.get('type') as PostType) ?? 'forum'

  const [type, setType]         = useState<PostType>(defaultType)
  const [category, setCategory] = useState('laptop')
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [rating, setRating]     = useState(7)
  const [products, setProducts] = useState<ProductResult[]>([])

  // 비교투표 옵션
  const [options, setOptions] = useState([
    { label: '', product_id: null as string | null, image_url: null as string | null },
    { label: '', product_id: null as string | null, image_url: null as string | null },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState('')
  const [token, setToken]   = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)

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
    // 비교투표에서 제품 선택 시 post_products에도 추가
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
          type, category: type === 'review' ? category : null,
          title: title.trim(), body: body.trim(),
          rating: type === 'review' ? rating : null,
          product_ids: products.map(p => p.id),
          compare_options: type === 'compare' ? options : undefined,
          display_name: displayName, avatar_url: avatarUrl,
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
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-white/40 text-sm mb-4">로그인이 필요합니다</p>
          <Link href="/login" className="bg-accent text-white text-sm font-bold px-6 py-2.5 rounded-xl">로그인</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/community" className="text-white/30 hover:text-white/60 transition-colors"><ChevronLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-black text-white">글 작성</h1>
        </div>

        <div className="space-y-5">
          {/* 유형 선택 */}
          <div>
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">유형</p>
            <div className="flex gap-2">
              {([['review','리뷰'],['forum','포럼'],['compare','비교투표']] as const).map(([k,l]) => (
                <button key={k} onClick={() => setType(k)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${type === k ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-surface border-border text-white/40 hover:text-white/70'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* 카테고리 (리뷰만) */}
          {type === 'review' && (
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">카테고리</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${category === c.key ? 'bg-accent text-white' : 'bg-surface border border-border text-white/40 hover:text-white/70'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div>
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">제목</p>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              placeholder={type === 'compare' ? '예: 맥북 M5 vs 갤럭시북 5 어떤게 나아요?' : '제목을 입력하세요'}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors" />
          </div>

          {/* 비교투표 옵션 */}
          {type === 'compare' && (
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">투표 항목</p>
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <div key={i} className="bg-surface-2 border border-border rounded-xl p-3 space-y-2">
                    <p className="text-xs text-white/30 font-semibold">{i === 0 ? 'A안' : i === 1 ? 'B안' : `${i+1}번`}</p>
                    <input value={opt.label} onChange={e => setOptions(prev => prev.map((o,j) => j===i ? {...o,label:e.target.value} : o))}
                      placeholder={`항목 ${i+1} 이름`}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors" />
                    <ProductSearch onSelect={p => handleOptionProductSelect(p, i)} exclude={options.map(o=>o.product_id).filter(Boolean) as string[]} />
                    {opt.product_id && <p className="text-[10px] text-accent">✓ 제품 연결됨</p>}
                  </div>
                ))}
                {options.length < 4 && (
                  <button onClick={() => setOptions(p => [...p, { label:'', product_id:null, image_url:null }])}
                    className="w-full py-2.5 border border-dashed border-border rounded-xl text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> 항목 추가 (최대 4개)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 본문 (비교투표 외) */}
          {type !== 'compare' && (
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">본문</p>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} maxLength={3000}
                placeholder="내용을 입력하세요"
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors resize-none leading-relaxed" />
              <p className="text-[10px] text-white/20 text-right mt-1">{body.length} / 3000</p>
            </div>
          )}

          {/* 평점 (리뷰만) */}
          {type === 'review' && (
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">평점</p>
              <div className="flex items-center gap-2">
                {Array.from({length:10},(_,i)=>i+1).map(n => (
                  <button key={n} onClick={() => setRating(n)}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${rating >= n ? 'bg-accent text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                    {n}
                  </button>
                ))}
                <span className="ml-2 text-sm font-black text-accent">{rating}<span className="text-xs text-white/30 font-normal">/10</span></span>
              </div>
            </div>
          )}

          {/* 제품 태그 (선택사항, 비교투표 제외) */}
          {type !== 'compare' && (
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">제품 태그 <span className="text-white/20 normal-case font-normal">(선택사항 — 제품 상세 페이지에 노출)</span></p>
              {products.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-2.5 py-1">
                      <span className="text-xs text-white/60 truncate max-w-[160px]">{p.name}</span>
                      <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))} className="text-white/30 hover:text-white/70 transition-colors">
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

          {/* 에러 + 제출 */}
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleSubmit} disabled={submitting || !canSubmit() || authed === null}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold text-sm transition-all">
            {submitting ? '등록 중...' : '게시하기'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function WritePage() {
  return <Suspense><WritePageInner /></Suspense>
}
