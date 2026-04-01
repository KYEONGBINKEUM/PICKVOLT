'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Pin, Trash2, ChevronRight } from 'lucide-react'

interface HistoryItem {
  id: number
  date: string
  title: string
  count: number
  pinned: boolean
  category: string
}

const INITIAL_HISTORY: HistoryItem[] = [
  { id: 1, date: 'march 12, 2024', title: 'pixel 8 pro vs s24 ultra vs iphone 15 pro', count: 3, pinned: true, category: 'smartphones' },
  { id: 2, date: 'today, 2:15 pm', title: 'macbook pro m3 vs dell xps 14', count: 2, pinned: false, category: 'laptops' },
  { id: 3, date: 'yesterday', title: 'sony wh-1000xm5 vs bose qc ultra vs airpods max', count: 3, pinned: false, category: 'audio' },
  { id: 4, date: 'march 10, 2024', title: 'ipad pro 12.9 vs galaxy tab s9 ultra', count: 2, pinned: false, category: 'smartphones' },
  { id: 5, date: 'february 24, 2024', title: 'fujifilm x100vi vs ricoh gr iii', count: 2, pinned: false, category: 'cameras' },
]

const FILTERS = ['all picks', 'pinned', 'smartphones', 'laptops', 'audio', 'cameras']

function HistoryCard({ item, onPin, onDelete }: {
  item: HistoryItem
  onPin: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className={`group relative flex items-center justify-between px-5 py-4 bg-surface rounded-card border border-border hover:border-white/10 transition-all ${item.pinned ? 'border-l-2 border-l-accent' : ''}`}>
      <div className="flex-1 min-w-0">
        {item.pinned && (
          <span className="inline-block text-[10px] font-black tracking-widest bg-accent text-white px-2 py-0.5 rounded-full uppercase mb-2">
            pinned
          </span>
        )}
        <p className="text-xs text-white/30 mb-1">{item.date}</p>
        <p className="text-sm font-bold text-white">{item.title}</p>
      </div>
      <div className="flex items-center gap-3 ml-6 flex-shrink-0">
        <span className="text-xs text-white/30 hidden md:block">{item.count} products</span>
        <Link
          href="/compare"
          className="text-xs font-semibold text-white/70 hover:text-white border border-border hover:border-white/20 px-4 py-1.5 rounded-full transition-all"
        >
          view summary
        </Link>
        <button
          onClick={() => onPin(item.id)}
          className={`p-2 rounded-full transition-all ${
            item.pinned
              ? 'text-accent bg-accent/10'
              : 'text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-full text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState(INITIAL_HISTORY)
  const [activeFilter, setActiveFilter] = useState('all picks')

  const togglePin = (id: number) =>
    setHistory((h) => h.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)))

  const deleteItem = (id: number) =>
    setHistory((h) => h.filter((item) => item.id !== id))

  const filtered =
    activeFilter === 'all picks'
      ? history
      : activeFilter === 'pinned'
      ? history.filter((h) => h.pinned)
      : history.filter((h) => h.category === activeFilter)

  const pinned = filtered.filter((h) => h.pinned)
  const thisWeek = filtered.filter((h) => !h.pinned && (h.date.includes('today') || h.date.includes('yesterday') || h.date.includes('march 1')))
  const older = filtered.filter((h) => !h.pinned && h.date.includes('february'))

  return (
    <>
      <Navbar showSearch searchValue="" onSearchChange={() => {}} searchPlaceholder="search through your past picks..." />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">library</p>
            <h1 className="text-4xl font-black text-white">comparison history</h1>
          </div>
          <p className="text-xs text-white/30 mt-4">showing {history.length} total sessions</p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === f
                  ? 'bg-white text-black'
                  : 'border border-border text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Pinned */}
        {pinned.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-black text-white">pinned</h2>
              <span className="text-xs text-white/30">priority access</span>
            </div>
            <div className="space-y-3">
              {pinned.map((item) => (
                <HistoryCard key={item.id} item={item} onPin={togglePin} onDelete={deleteItem} />
              ))}
            </div>
          </section>
        )}

        {/* This week */}
        {thisWeek.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-black text-white">this week</h2>
              <span className="text-xs text-white/30">last 7 days</span>
            </div>
            <div className="space-y-3">
              {thisWeek.map((item) => (
                <HistoryCard key={item.id} item={item} onPin={togglePin} onDelete={deleteItem} />
              ))}
            </div>
          </section>
        )}

        {/* Older */}
        {older.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-black text-white">older</h2>
              <span className="text-xs text-white/30">february 2024</span>
            </div>
            <div className="space-y-3">
              {older.map((item) => (
                <HistoryCard key={item.id} item={item} onPin={togglePin} onDelete={deleteItem} />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-white/30 text-sm">no comparisons here.</p>
            <Link href="/" className="inline-block mt-4 text-accent text-sm hover:underline">
              start comparing →
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-inner mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white">pickvolt</span>
          </div>
          <div className="flex gap-6 text-xs text-white/30">
            <a href="#" className="hover:text-white transition-colors">privacy</a>
            <a href="#" className="hover:text-white transition-colors">terms</a>
            <a href="#" className="hover:text-white transition-colors">api</a>
            <a href="#" className="hover:text-white transition-colors">contact</a>
          </div>
          <p className="text-xs text-white/20">© 2024 pickvolt. every decision is a new data point.</p>
        </div>
      </footer>

      {/* Right sidebar */}
      <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-surface-2 border border-border rounded-l-xl px-2 py-4 cursor-pointer hover:bg-surface transition-colors">
          <p className="text-[10px] text-white/20 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            full technical specifications
          </p>
        </div>
      </div>
    </>
  )
}
