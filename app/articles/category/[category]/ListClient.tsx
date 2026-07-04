'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'

export interface ArticleListItem {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  thumbnail_url: string | null
  published_at: string | null
}

const LIMIT = 12
type SortKey = 'latest' | 'popular' | 'views'

const CATEGORY_LABELS: Record<string, string> = {
  tech: '테크', it: 'IT', ai: 'AI', mobile: '모바일', review: '리뷰', security: '보안', startup: '스타트업',
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '.')
}

function ArticleCard({ item }: { item: ArticleListItem }) {
  const { t } = useI18n()
  return (
    <Link href={`/articles/${item.slug}`} style={{ display: 'block', position: 'relative', cursor: 'pointer', borderBottom: '1px solid #2A2A2A', paddingBottom: 14, textDecoration: 'none', color: 'inherit' }} className="pv-art-card">
      <div style={{ aspectRatio: '16/9', background: '#1A1A1A', marginBottom: 10, overflow: 'hidden' }}>
        {item.thumbnail_url
          ? <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: '#2A2A2A' }} />
        }
      </div>
      <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#FF4D00', marginBottom: 5 }}>
        {t(CATEGORY_I18N_KEY[item.category] ?? item.category)}
      </span>
      <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.45, color: '#EDEDED', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.1s' }} className="pv-art-title">
        {item.title}
      </h2>
      {item.summary && (
        <p style={{ fontSize: 14, color: '#777777', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.summary}
        </p>
      )}
      <p style={{ fontSize: 12, color: '#777777', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{formatDate(item.published_at)}</p>
    </Link>
  )
}

/* InfeedAd — uncomment when AdSense is approved
function InfeedAd() {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{ width: 110, height: 76, flexShrink: 0, background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#777777' }}>광고 이미지</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB', marginBottom: 4 }}>광고</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#EDEDED', marginBottom: 3 }}>리스트 페이지 인피드 광고 슬롯</p>
          <p style={{ fontSize: 14, color: '#777777' }}>카드 그리드 사이에 자연스럽게 배치되는 네이티브 광고입니다.</p>
          <p style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>ad.example.com</p>
        </div>
      </div>
    </div>
  )
}
*/

function ListPagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #2A2A2A', fontSize: 14, cursor: disabled ? 'default' : 'pointer',
    color: active ? '#fff' : '#EDEDED',
    background: active ? '#FF4D00' : '#0E0E0E',
    borderColor: active ? '#FF4D00' : '#2A2A2A',
    fontWeight: active ? 700 : 400,
    opacity: disabled ? 0.35 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    transition: 'border-color 0.1s, color 0.1s',
  })

  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '18px 0' }} className="pv-pagination">
      <button
        style={btnStyle(false, page === 1)}
        onClick={() => onPage(page - 1)}
        aria-label="이전 페이지"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="10 4 6 8 10 12"/></svg>
      </button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#777777', fontSize: 14 }}>…</span>
          : <button key={p} style={btnStyle(page === p)} onClick={() => onPage(p as number)} className="pv-pg-btn">{p}</button>
      )}
      <button
        style={btnStyle(false, page === totalPages)}
        onClick={() => onPage(page + 1)}
        aria-label="다음 페이지"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="6 4 10 8 6 12"/></svg>
      </button>
    </nav>
  )
}

export default function ListClient({
  category, initialItems, initialTotal,
}: { category: string; initialItems: ArticleListItem[]; initialTotal: number }) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [sort, setSort] = useState<SortKey>((searchParams.get('sort') as SortKey) ?? 'latest')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'))
  const [items, setItems] = useState(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'latest', label: t('articles.sort_latest') },
    { key: 'popular', label: t('articles.sort_popular') },
    { key: 'views', label: t('articles.sort_views') },
  ]
  const currentSortLabel = sortOptions.find((s) => s.key === sort)?.label ?? t('articles.sort_latest')

  useEffect(() => {
    if (sort === 'latest' && page === 1) return
    setLoading(true)
    fetch(`/api/articles?category=${category}&sort=${sort}&page=${page}&limit=${LIMIT}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page, category])

  useEffect(() => {
    const params = new URLSearchParams()
    if (sort !== 'latest') params.set('sort', sort)
    if (page !== 1) params.set('page', String(page))
    const qs = params.toString()
    router.replace(`/articles/category/${category}${qs ? `?${qs}` : ''}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const firstSix = items.slice(0, 6)
  const rest = items.slice(6)

  const catLabel = CATEGORY_LABELS[category] ?? category

  return (
    <>
      {/* Page title */}
      <div style={{ padding: '20px 0 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px' }}>
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#777777', marginBottom: 6 }}>
            <Link href="/" style={{ color: '#777777' }} className="pv-bc-home">{t('articles.breadcrumb_home')}</Link>
            <span>›</span>
            <span>{catLabel}</span>
          </nav>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#EDEDED', letterSpacing: '-0.025em' }}>{catLabel}</h1>
        </div>
      </div>

      {/* List content */}
      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '20px 20px 56px', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>

        {/* Sort bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #2A2A2A', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#777777', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {t('articles.total_count').replace('{n}', String(total))}
          </span>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #2A2A2A', color: '#EDEDED', background: '#0E0E0E', padding: '5px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              className="pv-sort-toggle"
            >
              <span>{currentSortLabel}</span>
              <svg viewBox="0 0 10 6" style={{ width: 10, height: 6, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="1 1 5 5 9 1"/></svg>
            </button>
            {dropdownOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, background: '#0E0E0E', border: '1px solid #2A2A2A', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', minWidth: '100%' }}>
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setSort(opt.key); setPage(1); setDropdownOpen(false) }}
                    style={{ padding: '9px 16px', fontSize: 13, color: sort === opt.key ? '#FF4D00' : '#777777', fontWeight: sort === opt.key ? 600 : 400, textAlign: 'left', borderBottom: '1px solid #2A2A2A', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                    className="pv-sort-opt"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* First grid */}
        <div className="pv-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {firstSix.map((item) => <ArticleCard key={item.id} item={item} />)}
        </div>

        {/* Infeed ad — uncomment when AdSense is approved */}
        {/* {rest.length > 0 && <InfeedAd />} */}

        {/* Second grid */}
        {rest.length > 0 && (
          <div className="pv-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {rest.map((item) => <ArticleCard key={item.id} item={item} />)}
          </div>
        )}

        <ListPagination page={page} totalPages={totalPages} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      </div>

      <style>{`
        .pv-art-card:hover .pv-art-title { color: #FF4D00; }
        .pv-bc-home:hover { color: #FF4D00; }
        .pv-sort-toggle:hover { border-color: #EDEDED; }
        .pv-sort-opt:last-child { border-bottom: none; }
        .pv-sort-opt:hover { color: #EDEDED; background: #1A1A1A; }
        .pv-pg-btn:hover { border-color: #FF4D00 !important; color: #FF4D00 !important; }
        @media (max-width: 1024px) { .pv-list-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 768px) { .pv-list-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 520px) { .pv-list-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}
