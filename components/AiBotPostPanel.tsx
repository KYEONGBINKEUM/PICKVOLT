'use client'

import { useState } from 'react'
import { Bot, X, ChevronDown, Loader2 } from 'lucide-react'
import { BOT_CHARACTERS } from '@/lib/ai-bots'
import { useI18n } from '@/lib/i18n'
import { useRouter } from 'next/navigation'

interface Props {
  token: string | null
  clanId?: string | null
  userPoints: number
  botPostCost: number
  onSuccess?: (postId: string) => void
}

export default function AiBotPostPanel({ token, clanId, userPoints, botPostCost, onSuccess }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [character, setCharacter]     = useState(BOT_CHARACTERS[0].key)
  const [topic, setTopic]             = useState('')
  const [context, setContext]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [result, setResult]           = useState<{ postId: string; title: string; pointsLeft: number } | null>(null)

  const selectedChar = BOT_CHARACTERS.find(b => b.key === character)!
  const canAfford = userPoints >= botPostCost

  const handleSubmit = async () => {
    if (!token || !topic.trim() || loading) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/ai-bot/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ character, topic: topic.trim(), clan_id: clanId ?? null, context: context.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(
        data.error === 'insufficient_points' ? `포인트 부족 (필요: ${data.required}pt, 보유: ${data.current}pt)` :
        data.error === 'ai_generation_failed' ? 'AI 생성 실패. 다시 시도해주세요.' :
        data.error === 'user_banned' ? '이용이 제한된 계정입니다.' :
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
          <p className="text-sm font-semibold text-white/80">AI 봇 대신 쓰게 하기</p>
          <p className="text-[11px] text-white/35">포인트를 사용해 AI 봇이 글을 작성합니다 · {botPostCost}pt</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-4">
          {result ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-emerald-400 font-semibold">✓ 봇이 글을 작성했습니다!</p>
              <p className="text-sm text-white/60 truncate">"{result.title}"</p>
              <p className="text-xs text-white/30">남은 포인트: {result.pointsLeft}pt</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => router.push(`/community/posts/${result.postId}`)}
                  className="px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  글 보러가기
                </button>
                <button
                  onClick={() => { setResult(null); setTopic(''); setContext('') }}
                  className="px-4 py-2 border border-border text-white/50 text-sm rounded-xl hover:text-white transition-colors"
                >
                  다시 쓰기
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 캐릭터 선택 */}
              <div>
                <p className="text-xs text-white/40 mb-2 font-medium">봇 캐릭터</p>
                <div className="grid grid-cols-3 gap-2">
                  {BOT_CHARACTERS.map(b => (
                    <button
                      key={b.key}
                      onClick={() => setCharacter(b.key)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                        character === b.key
                          ? 'border-accent bg-accent/10 text-white'
                          : 'border-border text-white/40 hover:border-white/20 hover:text-white/70'
                      }`}
                    >
                      <span className="text-xl">{b.emoji}</span>
                      <span className="text-[11px] font-semibold">{b.name}</span>
                      <span className="text-[9px] text-white/30 leading-tight">{b.description.slice(0, 18)}..</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 주제 입력 */}
              <div>
                <p className="text-xs text-white/40 mb-1.5 font-medium">글 주제 <span className="text-red-400">*</span></p>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="예) 갤럭시 S25 울트라 실사용 후기, 요즘 노트북 추천 트렌드..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              {/* 추가 맥락 (선택) */}
              <div>
                <p className="text-xs text-white/40 mb-1.5 font-medium">방향 힌트 <span className="text-white/20">(선택)</span></p>
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="예) 배터리 위주로, 학생 입장에서, 부정적인 의견 포함..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex items-center justify-between">
                <div className="text-xs text-white/30">
                  {selectedChar.emoji} {selectedChar.name}이 작성 · <span className={canAfford ? 'text-accent' : 'text-red-400'}>{botPostCost}pt</span> 소모
                  {!canAfford && <span className="text-red-400 ml-1">(보유 {userPoints}pt 부족)</span>}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !topic.trim() || !canAfford}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  {loading ? '생성 중...' : '봇이 쓰기'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
