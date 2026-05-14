'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Loader2 } from 'lucide-react'
import { BOT_CHARACTERS } from '@/lib/ai-bots'

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
  /** 답글로 달 부모 댓글 ID (없으면 일반 댓글) */
  parentId?: string | null
  onCommentAdded: (comment: Comment) => void
}

export default function AiBotCommentButton({ postId, token, userPoints, botCommentCost, parentId, onCommentAdded }: Props) {
  const [open, setOpen]           = useState(false)
  const [character, setCharacter] = useState(BOT_CHARACTERS[0].key)
  const [direction, setDirection] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const panelRef                  = useRef<HTMLDivElement>(null)
  const buttonRef                 = useRef<HTMLButtonElement>(null)

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
      body: JSON.stringify({ character, post_id: postId, parent_id: parentId ?? null, direction: direction.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(
        data.error === 'insufficient_points' ? `포인트 부족 (${data.required}pt 필요)` :
        data.error === 'ai_generation_failed' ? 'AI 생성 실패. 다시 시도해주세요.' :
        data.error
      )
    } else {
      onCommentAdded(data.comment)
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setDirection('') }, 1500)
    }
    setLoading(false)
  }

  const selectedChar = BOT_CHARACTERS.find(b => b.key === character)!

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title="AI 봇 댓글 달기"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-white/30 hover:text-accent hover:border-accent/40 transition-colors text-xs font-medium"
      >
        <Bot className="w-3.5 h-3.5" />
        <span>봇 댓글</span>
        <span className="text-[10px] text-white/20 ml-0.5">{botCommentCost}pt</span>
      </button>

      {open && (
        <div ref={panelRef} style={popupStyle} className="w-72 bg-background border border-border rounded-2xl shadow-2xl z-[9999] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-accent" />
              <span className="text-sm font-semibold text-white">{parentId ? 'AI 봇 답글' : 'AI 봇 댓글'}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {done ? (
            <div className="px-4 py-6 text-center">
              <p className="text-emerald-400 font-semibold text-sm">✓ 봇이 {parentId ? '답글' : '댓글'}을 달았어요!</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-3">
              {/* 캐릭터 선택 */}
              <div className="flex gap-1.5">
                {BOT_CHARACTERS.map(b => (
                  <button
                    key={b.key}
                    onClick={() => setCharacter(b.key)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-center transition-all ${
                      character === b.key
                        ? 'border-accent bg-accent/10'
                        : 'border-border text-white/30 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base">{b.emoji}</span>
                    <span className="text-[10px] font-semibold text-white/70">{b.name}</span>
                  </button>
                ))}
              </div>

              {/* 방향 힌트 */}
              <input
                type="text"
                value={direction}
                onChange={e => setDirection(e.target.value)}
                placeholder="방향 힌트 (선택) - 예) 긍정적으로, 질문 형식으로..."
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent"
              />

              {error && <p className="text-[11px] text-red-400">{error}</p>}

              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${canAfford ? 'text-white/30' : 'text-red-400'}`}>
                  {selectedChar.emoji} {selectedChar.name} · {botCommentCost}pt
                  {!canAfford && ' (부족)'}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !canAfford}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                  {loading ? '생성 중...' : '달기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
