import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { buildPostPrompt, containsUnsafeContent } from '@/lib/ai-bots'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  return user ?? null
}

// POST /api/ai-bot/post
// body: { topic: string, clan_id?: string, context?: string }
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { topic, clan_id, context, lang } = await req.json()
  if (!topic?.trim()) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 })
  }

  const svc = makeServiceClient()
  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())

  // 포인트 비용 확인
  const { data: settingsRows } = await svc.from('app_settings').select('key, value')
    .in('key', ['ai_bot_post_points'])
  const sm: Record<string, string> = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
  const cost = parseInt(sm['ai_bot_post_points'] ?? '50')

  // 포인트 확인 및 차감
  const { data: profile } = await svc.from('profiles').select('points, is_banned, banned_until, nickname, avatar_url')
    .eq('user_id', user.id).maybeSingle()
  const curPoints = (profile as { points?: number } | null)?.points ?? 0
  const isBanned = (profile as { is_banned?: boolean } | null)?.is_banned ?? false
  const bannedUntil = (profile as { banned_until?: string | null } | null)?.banned_until

  if (isBanned || (bannedUntil && new Date(bannedUntil) > new Date())) {
    return NextResponse.json({ error: 'user_banned' }, { status: 403 })
  }
  if (cost > 0 && curPoints < cost) {
    return NextResponse.json({ error: 'insufficient_points', required: cost, current: curPoints }, { status: 402 })
  }

  // Gemini API 호출
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  let title = ''
  let body = ''
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: buildPostPrompt(topic.trim(), context?.trim(), lang),
    })
    // Gemini safety block 체크
    const candidate = result.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      console.error('[ai-bot/post] Gemini blocked:', candidate.finishReason, candidate.safetyRatings)
      throw new Error(`blocked: ${candidate.finishReason}`)
    }
    const raw = (result.text ?? '').trim()
    if (!raw) throw new Error('empty response')
    // JSON 파싱
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) { console.error('[ai-bot/post] no JSON in response:', raw.slice(0, 200)); throw new Error('no json') }
    const parsed = JSON.parse(jsonMatch[0])
    title = parsed.title?.trim() ?? ''
    body = parsed.body?.trim() ?? ''
    if (!title || !body) throw new Error('empty content')
    if (containsUnsafeContent(title) || containsUnsafeContent(body)) throw new Error('unsafe content')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai-bot/post] generation error:', msg)
    return NextResponse.json({ error: 'ai_generation_failed', debug: msg }, { status: 500 })
  }

  // 글 저장 (포인트 차감 전 먼저 시도)
  const userDisplayName = (profile as { nickname?: string | null } | null)?.nickname ?? user.email?.split('@')[0] ?? 'user'
  const { data: post, error } = await svc.from('community_posts').insert({
    user_id: user.id,
    user_display_name: 'Pickvolt AI',
    user_avatar_url: null,
    title,
    body,
    type: 'forum',
    clan_id: clan_id ?? null,
    is_ai_generated: true,
    ai_character: null,
    ai_requester_name: userDisplayName,
  }).select('id, title').single()

  if (error) {
    console.error('[ai-bot/post] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 포인트 차감 (INSERT 성공 후)
  if (cost > 0 && !isAdmin) {
    await svc.from('profiles').update({ points: Math.max(0, curPoints - cost) }).eq('user_id', user.id)
    await svc.from('point_transactions').insert({
      user_id: user.id, amount: -cost, type: 'ai_bot_post',
      description: 'AI봇 글쓰기',
    })
  }

  return NextResponse.json({ ok: true, post, pointsUsed: cost, pointsLeft: Math.max(0, curPoints - cost) }, { status: 201 })
}
