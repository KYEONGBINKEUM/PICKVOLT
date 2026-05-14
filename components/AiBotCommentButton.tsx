'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Loader2, ChevronDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const LANG_OPTIONS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
]

interface Comment {
  id: string
  body: string
  user_display_name: string
  user_avatar_url: string | null
  parent_id: string | null
  upvotes: number
  created_at: string
  my_vote: boolean
  is_ai_generated?: boolean
}

interface Props {
  postId: string
  token: string | null
  userPoints: number
  botCommentCost: number
  parentId?: string | null
  onCommentAdded: (comment: Comment) => void
}

export default function AiBotCommentButton({ postId, token, userPoints, botCommentCost, parentId, onCommentAdded }: Props) {
  const { t, locale } = useI18n()
  const [open, setOpen]             = useState(false)
  const [direction, setDirection]   = useState('')
  const [lang, setLang]             = useState<string>(locale)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const panelRef                    = useRef<HTMLDivElement>(null)
  const buttonRef                   = useRef<HTMLButtonElement>(null)

  // locale 변경 시 lang 동기화
  useEffect(() => { setLang(locale) }, [locale])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setError('')
    setOpen(v => !v)
  }

  if (!token) return null

  const canAfford = userPoints >= botCommentCost

  const handleSubmit = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/ai-bot/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ post_id: postId, parent_id: parentId ?? null, direction: direction.trim() || null, lang }),
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
      onCommentAdded(data.comment)
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setDirection('') }, 1500)
    }
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title={t('ai_bot.comment_btn')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-white/30 hover:text-accent hover:border-accent/40 transition-colors text-xs font-medium"
      >
        <Bot className="w-3.5 h-3.5" />
        <span>{t('ai_bot.comment_btn')}</span>
        <span className="text-[10px] text-white/20 ml-0.5">{botCommentCost}pt</span>
      </button>

      {open && (
        <div ref={panelRef} style={popupStyle} className="w-64 bg-background border border-border rounded-2xl shadow-2xl z-[9999] overflow-hidden">
          {done ? (
            <div className="px-4 py-5 text-center">
              <p className="text-emerald-400 font-semibold text-sm">
                ✓ {parentId ? t('ai_bot.replied') : t('ai_bot.commented')}
              </p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-white/80 font-medium">
                {parentId ? t('ai_bot.reply_ask') : t('ai_bot.comment_ask')}
              </p>

              {/* 언어 선택 */}
              <div className="relative">
                <label className="text-[11px] text-white/30 mb-1 block">{t('ai_bot.language')}</label>
                <div className="relative">
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    className="w-full appearance-none bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50 pr-7"
                  >
                    {LANG_OPTIONS.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* 방향 힌트 */}
              <input
                type="text"
                value={direction}
                onChange={e => setDirection(e.target.value)}
                placeholder={t('ai_bot.direction_placeholder')}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/50"
              />

              <p className={`text-xs ${canAfford ? 'text-white/30' : 'text-red-400'}`}>
                {botCommentCost}pt {t('ai_bot.pts_cost')}{!canAfford && ` · ${t('ai_bot.insufficient')}`}
              </p>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !canAfford}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent hover:bg-accent/80 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {loading ? t('ai_bot.writing') : t('ai_bot.yes')}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 py-2 border border-border text-white/40 hover:text-white hover:border-white/20 disabled:opacity-40 text-xs font-bold rounded-xl transition-colors"
                >
                  {t('ai_bot.no')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
