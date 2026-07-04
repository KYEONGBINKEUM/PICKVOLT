'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { Pagination } from '@/components/PostFeed'
import AdSlot from '@/components/articles/AdSlot'
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

function ArticleCard({ item }: { item: ArticleListItem }) {
  const { t } = useI18n()
  return (
    <Link href={`/articles/${item.slug}`} className="block rounded-card overflow-hidden bg-surface border border-border group">
      <div className="aspect-video bg-background overflow-hidden">
        {item.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        )}
      </div>
      <div className="p-4">
        <span className="text-xs font-bold text-accent/70">{t(CATEGORY_I18N_KEY[item.category] ?? item.category)}</span>
        <h2 className="text-sm font-bold text-white mt-1.5 mb-1.5 line-clamp-2 leading-snug">{item.title}</h2>
        {item.summary && <p className="text-xs text-white/40 line-clamp-2 mb-2">{item.summary}</p>}
        <p className="text-[11px] text-white/25">{(item.published_at ?? '').slice(0, 10).replace(/-/g, '.')}</p>
      </div>
    </Link>
  )
}

export default function ListClient({
  category, initialItems, initialTotal,
}: { category: string; initialItems: ArticleListItem[]; initialTotal: number }) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sort, setSort] = useState<SortKey>((searchParams.get('sort') as SortKey) ?? 'latest')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'))
  const [items, setItems] = useState(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 초기 로드는 서버에서 받은 데이터를 그대로 사용하고, 이후 정렬/페이지 변경 시에만 재요청
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

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const firstSix = items.slice(0, 6)
  const rest = items.slice(6)

  return (
    <div>
      <nav className="text-xs text-white/30 mb-2">
        <Link href="/" className="hover:text-white">{t('articles.breadcrumb_home')}</Link>
        <span className="mx-1.5">›</span>
        <span>{t(CATEGORY_I18N_KEY[category] ?? category)}</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-white mb-6">{t(CATEGORY_I18N_KEY[category] ?? category)}</h1>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/40">{t('articles.total_count').replace('{n}', String(total))}</span>
        <div className="flex gap-1">
          {(['latest', 'popular', 'views'] as SortKey[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${sort === s ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
            >
              {t(`articles.sort_${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {firstSix.map((item) => <ArticleCard key={item.id} item={item} />)}
        {rest.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <AdSlot variant="infeed" />
          </div>
        )}
        {rest.map((item) => <ArticleCard key={item.id} item={item} />)}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
