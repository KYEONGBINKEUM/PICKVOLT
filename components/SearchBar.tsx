'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Check, Loader2 } from 'lucide-react'
import { useCompareCart } from '@/lib/compareCart'

interface SearchResult {
  id: string
  name: string
  brand: string
  category: string
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { add, has, cart } = useCompareCart()

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=6`)
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length === 1) {
      router.push(`/product/${results[0].id}`)
    } else if (results.length > 1 && query.trim()) {
      // 첫 번째 결과 상세 페이지로
      router.push(`/product/${results[0].id}`)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setFocused(false)
    setQuery('')
    router.push(`/product/${result.id}`)
  }

  const handleAddToCompare = (e: React.MouseEvent, result: SearchResult) => {
    e.stopPropagation()
    add({ id: result.id, name: result.name, brand: result.brand, category: result.category })
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <div
        className={`flex items-center gap-3 bg-surface border transition-all duration-200 rounded-full px-5 py-4 ${
          focused ? 'border-white/20 shadow-lg shadow-black/50' : 'border-border'
        }`}
      >
        {searching
          ? <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
          : <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="search for devices, laptops, or specs..."
          className="flex-1 bg-transparent text-white placeholder:text-white/30 text-base focus:outline-none"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]) }}
            className="text-white/30 hover:text-white/60 transition-colors text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {focused && (results.length > 0 || searching) && (
        <div className="absolute top-full mt-2 w-full bg-surface-2 border border-border rounded-2xl overflow-hidden z-50 shadow-2xl">
          {results.map((result) => {
            const inCart = has(result.id)
            const cartFull = cart.length >= 4
            return (
              <div
                key={result.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-surface transition-colors cursor-pointer group"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Search className="w-3 h-3 text-white/30 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 group-hover:text-white transition-colors truncate">
                      {result.name}
                    </p>
                    <p className="text-xs text-white/30">{result.brand} · {result.category}</p>
                  </div>
                </div>

                {/* + 버튼 */}
                <button
                  type="button"
                  onClick={(e) => handleAddToCompare(e, result)}
                  disabled={inCart || cartFull}
                  title={inCart ? '이미 추가됨' : cartFull ? '최대 4개' : '비교에 추가'}
                  className={`flex-shrink-0 ml-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    inCart
                      ? 'bg-accent/20 text-accent'
                      : cartFull
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-white/10 text-white/60 hover:bg-accent hover:text-white'
                  }`}
                >
                  {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </form>
  )
}
