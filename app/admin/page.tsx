'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Edit2, CheckCircle, AlertCircle, Circle, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

interface Product {
  id: string
  name: string
  brand: string
  category: string
  image_url: string | null
  scrape_status: string | null
  price_usd: number | null
}

const CATEGORIES = ['', 'laptop', 'smartphone', 'tablet', 'monitor']
const BRANDS = ['', 'Samsung', 'Apple', 'HP', 'ASUS', 'Dell', 'Lenovo', 'LG', 'Sony']

function ImageStatus({ url }: { url: string | null }) {
  if (!url) return <Circle size={14} className="text-white/20" />
  if (url.includes('hp_og_logo') || url.includes('Sno/79183'))
    return <AlertCircle size={14} className="text-red-400" />
  return <CheckCircle size={14} className="text-emerald-400" />
}

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = (data.user?.email ?? '').toLowerCase()
      if (!data.user) {
        router.replace('/login')
        return
      }
      if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
        router.replace('/')
        return
      }
      setAuthed(true)
      setLoading(false)
    })
  }, [router])

  const fetchProducts = useCallback(async () => {
    let q = supabase
      .from('products')
      .select('id, name, brand, category, image_url, scrape_status, price_usd')
      .order('brand')
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search) q = q.ilike('name', `%${search}%`)
    if (category) q = q.eq('category', category)
    if (brand) q = q.eq('brand', brand)

    const { data } = await q
    setProducts(data ?? [])
  }, [search, category, brand, page])

  useEffect(() => {
    if (authed) fetchProducts()
  }, [authed, fetchProducts])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!authed) return null

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white text-base">pickvolt</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60 font-medium">admin</span>
        </div>
        <Link href="/mypage" className="text-sm text-white/40 hover:text-white transition-colors">my page</Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black mb-6">제품 관리</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="제품명 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="relative">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0) }}
              className="appearance-none bg-surface border border-border rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c || '전체 카테고리'}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(0) }}
              className="appearance-none bg-surface border border-border rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-accent"
            >
              {BRANDS.map((b) => (
                <option key={b} value={b}>{b || '전체 브랜드'}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-surface border border-border rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-white/40 font-medium w-12"></th>
                <th className="text-left px-4 py-3 text-white/40 font-medium">제품명</th>
                <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">브랜드</th>
                <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">카테고리</th>
                <th className="text-left px-4 py-3 text-white/40 font-medium w-8">이미지</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  {/* 썸네일 */}
                  <td className="px-4 py-2">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-8 h-8 object-contain rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-white/5" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-white/90 max-w-xs truncate">{p.name}</td>
                  <td className="px-4 py-2 text-white/50 hidden md:table-cell">{p.brand}</td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <span className="text-xs bg-white/10 rounded-full px-2 py-0.5 text-white/50">{p.category}</span>
                  </td>
                  <td className="px-4 py-2">
                    <ImageStatus url={p.image_url} />
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-accent transition-colors inline-flex"
                    >
                      <Edit2 size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/30">제품 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm text-white/40">
          <span>{page * PAGE_SIZE + 1}–{page * PAGE_SIZE + products.length} 표시</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={products.length < PAGE_SIZE}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
