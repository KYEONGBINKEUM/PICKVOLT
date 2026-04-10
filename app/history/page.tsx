'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Pin, Trash2, Loader2 } from 'lucide-react'
import { supabase, getUserHistory, togglePin, deleteComparison } from '@/lib/supabase'
import type { ComparisonHistory } from '@/lib/supabase'
import { getLocalHistory, deleteLocalHistory, type LocalHistory } from '@/lib/localHistory'
import { useI18n } from '@/lib/i18n'
import { shortenCompareTitle } from '@/lib/utils'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
  if (diffDays < 2) return 'yesterday'
  if (diffDays < 7) return `${Math.floor(diffDays)} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isRecent(dateStr: string): boolean {
  const diffDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

function HistoryCard({
  item,
  onPin,
  onDelete,
}: {
  item: ComparisonHistory
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className={`group relative flex items-center justify-between px-5 py-4 bg-surface rounded-card border transition-all hover:border-white/10 ${item.pinned ? 'border-l-2 border-l-accent border-border' : 'border-border'}`}>
      <div className="flex-1 min-w-0">
        {item.pinned && (
          <span className="inline-block text-[10px] font-black tracking-widest bg-accent text-white px-2 py-0.5 rounded-full uppercase mb-2">
            {t('history.pinned')}
          </span>
        )}
        <p className="text-xs text-white/30 mb-1">{formatDate(item.created_at)}</p>
        <p className="text-sm font-bold text-white truncate pr-4">{shortenCompareTitle(item.title)}</p>
        {item.result?.winner && (
          <p className="text-xs text-accent/70 mt-1">
            {t('compare.aipick')}: {item.result.winner}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 ml-6 flex-shrink-0">
        <span className="text-xs text-white/30 hidden md:block">
          {item.products.length} {t('history.products')}
        </span>
        <Link
          href={`/compare?ids=${item.products.join(',')}&history=${item.id}`}
          className="text-xs font-semibold text-white/70 hover:text-white border border-border hover:border-white/20 px-4 py-1.5 rounded-full transition-all"
        >
          {t('history.view')}
        </Link>
        <button
          onClick={() => onPin(item.id, !item.pinned)}
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
          className="p-2 rounded-full text-white/30 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { t } = useI18n()
  const [history, setHistory] = useState<ComparisonHistory[]>([])
  const [localHistory, setLocalHistory] = useState<LocalHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pinned'>('all')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLocalHistory(getLocalHistory())
        setLoading(false)
        return
      }
      setUserId(data.user.id)
      const items = await getUserHistory(data.user.id)
      setHistory(items)
      setLoading(false)
    })
  }, [])

  const handlePin = async (id: string, pinned: boolean) => {
    setHistory((h) => h.map((item) => (item.id === id ? { ...item, pinned } : item)))
    await togglePin(id, pinned)
  }

  const handleDelete = async (id: string) => {
    if (userId) {
      setHistory((h) => h.filter((item) => item.id !== id))
      await deleteComparison(id)
    } else {
      deleteLocalHistory(id)
      setLocalHistory((h) => h.filter((item) => item.id !== id))
    }
  }

  const filtered = filter === 'pinned' ? history.filter((h) => h.pinned) : history
  const pinned = filtered.filter((h) => h.pinned)
  const recent = filtered.filter((h) => !h.pinned && isRecent(h.created_at))
  const older = filtered.filter((h) => !h.pinned && !isRecent(h.created_at))

  const localRecent = localHistory.filter((h) => isRecent(h.created_at))
  const localOlder = localHistory.filter((h) => !isRecent(h.created_at))

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">{t('history.library')}</p>
            <h1 className="text-4xl font-black text-white">{t('compare.history')}</h1>
          </div>
          {!loading && userId && (
            <p className="text-xs text-white/30 mt-4">
              {history.length} {t('history.total')}
            </p>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex justify-center py-32">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* 비로그인 배너 */}
            {!userId && (
              <div className="flex items-center justify-between bg-surface border border-border rounded-card px-5 py-4 mb-8">
                <p className="text-sm text-white/50">{t('compare.signin_history')}</p>
                <Link
                  href="/login"
                  className="flex-shrink-0 ml-4 bg-accent hover:bg-accent/90 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  {t('auth.signin')}
                </Link>
              </div>
            )}

            {/* 로그인 유저: Filter tabs + history */}
            {userId && (
              <>
                <div className="flex gap-2 mb-10">
                  {(['all', 'pinned'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        filter === f
                          ? 'bg-white text-black'
                          : 'border border-border text-white/50 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {f === 'all' ? t('history.filter_all') : t('history.pinned')}
                    </button>
                  ))}
                </div>

                {pinned.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-black text-white">{t('history.pinned')}</h2>
                    </div>
                    <div className="space-y-3">
                      {pinned.map((item) => (
                        <HistoryCard key={item.id} item={item} onPin={handlePin} onDelete={handleDelete} />
                      ))}
                    </div>
                  </section>
                )}

                {recent.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-black text-white">{t('history.recent')}</h2>
                      <span className="text-xs text-white/30">{t('compare.last30').replace('30', '7')}</span>
                    </div>
                    <div className="space-y-3">
                      {recent.map((item) => (
                        <HistoryCard key={item.id} item={item} onPin={handlePin} onDelete={handleDelete} />
                      ))}
                    </div>
                  </section>
                )}

                {older.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-black text-white">{t('history.older')}</h2>
                    </div>
                    <div className="space-y-3">
                      {older.map((item) => (
                        <HistoryCard key={item.id} item={item} onPin={handlePin} onDelete={handleDelete} />
                      ))}
                    </div>
                  </section>
                )}

                {filtered.length === 0 && (
                  <div className="text-center py-24">
                    <p className="text-white/30 text-sm">{t('history.empty')}</p>
                    <Link href="/" className="inline-block mt-4 text-accent text-sm hover:underline">
                      {t('history.start')}
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* 비로그인 유저: localStorage 기록 */}
            {!userId && (
              <>
                {localRecent.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-black text-white">{t('history.recent')}</h2>
                    </div>
                    <div className="space-y-3">
                      {localRecent.map((item) => (
                        <HistoryCard
                          key={item.id}
                          item={{ ...item, user_id: '', pinned: false }}
                          onPin={() => {}}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {localOlder.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-black text-white">{t('history.older')}</h2>
                    </div>
                    <div className="space-y-3">
                      {localOlder.map((item) => (
                        <HistoryCard
                          key={item.id}
                          item={{ ...item, user_id: '', pinned: false }}
                          onPin={() => {}}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {localHistory.length === 0 && (
                  <div className="text-center py-24">
                    <p className="text-white/30 text-sm">{t('history.empty')}</p>
                    <Link href="/" className="inline-block mt-4 text-accent text-sm hover:underline">
                      {t('history.start')}
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
