'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Loader2 } from 'lucide-react'
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
  parentId?: string | null
  onCommentAdded: (comment: Comment) => void
}

// 매번 랜덤 캐릭터 선택
function randomCharacter() {
  return BOT_CHARACTERS[Math.floor(Math.random() * BOT_CHARACTERS.length)].key
}

export default function AiBotCommentButton({ postId, token, userPoints, botCommentCost, parentId, onCommentAdded }: Props) {
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const panelRef                    = useRef<HTMLDivElement>(null)
  const buttonRef                   = useRef<HTMLButtonElement>(null)

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
    const character = randomCharacter()
    const res = await fetch('/api/ai-bot/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ character, post_id: postId, parent_id: parentId ?? null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(
        data.error === 'insufficient_points' ? `포인트가 부족해요 (${data.required}pt 필요)` :
        data.error === 'ai_generation_failed' ? 'AI 생성 실패. 다시 시도해주세요.' :
        data.error
      )
    } else {
      onCommentAdded(data.comment)
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false) }, 1500)
    }
    setLoading(false)
  }

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
        <div ref={panelRef} style={popupStyle} className="w-56 bg-background border border-border rounded-2xl shadow-2xl z-[9999] overflow-hidden">
          {done ? (
            <div className="px-4 py-5 text-center">
              <p className="text-emerald-400 font-semibold text-sm">✓ 봇이 {parentId ? '답글' : '댓글'}을 달았어요!</p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-white/80 font-medium">
                AI 봇이 {parentId ? '답글' : '댓글'}을 달까요?
              </p>
              <p className={`text-xs ${canAfford ? 'text-white/30' : 'text-red-400'}`}>
                {botCommentCost}pt 차감{!canAfford && ' · 포인트 부족'}
              </p>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !canAfford}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent hover:bg-accent/80 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {loading ? '생성 중...' : '예'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 py-2 border border-border text-white/40 hover:text-white hover:border-white/20 disabled:opacity-40 text-xs font-bold rounded-xl transition-colors"
                >
                  아니오
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
