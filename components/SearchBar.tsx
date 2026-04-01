'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

const SUGGESTIONS = [
  'iphone 16 pro',
  'samsung s24 ultra',
  'pixel 9 pro',
  'macbook pro m4',
  'dell xps 15',
  'sony wh-1000xm5',
  'bose qc ultra',
  'rtx 4090',
  'rx 7900 xtx',
  'ipad pro m4',
]

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length > 1) {
      setSuggestions(
        SUGGESTIONS.filter((s) => s.includes(query.toLowerCase())).slice(0, 5)
      )
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/compare?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <div
        className={`flex items-center gap-3 bg-surface border transition-all duration-200 rounded-full px-5 py-4 ${
          focused ? 'border-white/20 shadow-lg shadow-black/50' : 'border-border'
        }`}
      >
        <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
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
            onClick={() => setQuery('')}
            className="text-white/30 hover:text-white/60 transition-colors text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-surface-2 border border-border rounded-2xl overflow-hidden z-50 shadow-2xl">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => {
                setQuery(s)
                router.push(`/compare?q=${encodeURIComponent(s)}`)
              }}
              className="w-full text-left px-5 py-3 text-sm text-white/70 hover:bg-surface hover:text-white transition-colors flex items-center gap-3"
            >
              <Search className="w-3 h-3 text-white/30" />
              {s}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
