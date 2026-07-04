'use client'

import { useState, useEffect } from 'react'
import { Bot, ChevronDown, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import { BLOG_CATEGORIES } from '@/lib/blogCategories'

const LANG_OPTIONS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
]

interface Props {
  token: string | null
  clanId?: string | null
  userPoints: number
  botPostCost: number
  category?: string
  onSuccess?: (postId: string) => void
}

export default function AiBotPostPanel({ token, clanId, userPoints, botPostCost, category, onSuccess }: Props) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [topic, setTopic]     = useState('')
  const [context, setContext] = useState('')
  const [lang, setLang]       = useState<string>(locale)
  const [postCategory, setPostCategory] = useState(category ?? BLOG_CATEGORIES[0].slug)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState<{ postId: string; title: string; pointsLeft: number } | null>(null)

  useEffect(() => { setLang(locale) }, [locale])
  useEffect(() => { if (category) setPostCategory(category) }, [category])

  const canAfford = userPoints >= botPostCost

  const handleSubmit = async () => {
    if (!token || !topic.trim() || loading) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/ai-bot/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic: topic.trim(), clan_id: clanId ?? null, context: context.trim() || null, lang, category: postCategory }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(
        data.error === 'insufficient_points' ? `${t('ai_bot.insufficient')} (${data.required}pt)` :
        data.error === 'ai_generation_failed' ? t('ai_bot.generation_failed') :
        data.error === 'user_banned' ? t('ai_bot.banned') :
        data.error
      )
    } else {
      setResult({ postId: data.post.id, title: data.post.title, pointsLeft: data.pointsLeft })
      onSuccess?.(data.post.id)
    }
    setLoading(false)
  }

  if (!token) return null

  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden bg-surface/50">
      {/* 헤더 토글 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white/80">{t('ai_bot.write_for_me')}</p>
          <p className="text-[11px] text-white/35">{t('ai_bot.write_desc')} · {botPostCost}pt</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-4">
          {result ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-emerald-400 font-semibold">✓ {t('ai_bot.posted')}</p>
              <p className="text-sm text-white/60 truncate">"{result.title}"</p>
              <p className="text-xs text-white/30">{t('ai_bot.pts_left')}: {result.pointsLeft}pt</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => router.push(`/community/posts/${result.postId}`)}
                  className="px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {t('ai_bot.view_post')}
                </button>
                <button
                  onClick={() => { setResult(null); setTopic(''); setContext('') }}
                  className="px-4 py-2 border border-border text-white/50 text-sm rounded-xl hover:text-white transition-colors"
                >
                  {t('ai_bot.write_again')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 주제 입력 */}
              <div>
                <p className="text-xs text-white/40 mb-1.5 font-medium">
                  {t('ai_bot.topic_label')} <span className="text-red-400">*</span>
                </p>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={t('ai_bot.topic_placeholder')}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              {/* 카테고리 선택 */}
              <div>
                <p className="text-xs text-white/40 mb-1.5 font-medium">{t('write.category')}</p>
                <div className="relative">
                  <select
                    value={postCategory}
                    onChange={e => setPostCategory(e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent pr-8"
                  >
                    {BLOG_CATEGORIES.map(c => (
                      <option key={c.slug} value={c.slug}>{t(c.labelKey)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* 언어 선택 */}
              <div>
                <p className="text-xs text-white/40 mb-1.5 font-medium">{t('ai_bot.language')}</p>
                <div className="relative">
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent pr-8"
                  >
                    {LANG_OPTIONS.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* 방향 힌트 (선택) */}
              <div>
                <p className="text-xs text-white/40 mb-1.5 font-medium">
                  {t('ai_bot.context_label')} <span className="text-white/20">{t('ai_bot.context_optional')}</span>
                </p>
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder={t('ai_bot.context_placeholder')}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex items-center justify-between">
                <div className={`text-xs ${canAfford ? 'text-white/30' : 'text-red-400'}`}>
                  <span className={canAfford ? 'text-accent' : 'text-red-400'}>{botPostCost}pt</span> {t('ai_bot.pts_cost')}
                  {!canAfford && <span className="ml-1">({t('ai_bot.insufficient')})</span>}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !topic.trim() || !canAfford}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  {loading ? t('ai_bot.writing') : t('ai_bot.write_btn')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
