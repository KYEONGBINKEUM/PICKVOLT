import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { buildCommentPrompt, containsUnsafeContent } from '@/lib/ai-bots'

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

// POST /api/ai-bot/comment
// body: { post_id: string, parent_id?: string, direction?: string }
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { post_id, parent_id, direction, lang } = await req.json()
  if (!post_id) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  }

  const svc = makeServiceClient()
  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())

  // 포인트 비용 확인
  const { data: settingsRows } = await svc.from('app_settings').select('key, value')
    .in('key', ['ai_bot_comment_points'])
  const sm: Record<string, string> = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
  const cost = parseInt(sm['ai_bot_comment_points'] ?? '20')

  // 포인트 확인
  const { data: profile } = await svc.from('profiles').select('points, is_banned, banned_until, nickname')
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

  // 게시글 내용 조회
  const { data: post } = await svc.from('community_posts')
    .select('title, body, ai_comments_enabled').eq('id', post_id).maybeSingle()
  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 })
  if (post.ai_comments_enabled === false) return NextResponse.json({ error: 'ai_comments_disabled' }, { status: 403 })

  // 기존 댓글 조회
  const { data: existingComments } = await svc.from('community_comments')
    .select('user_display_name, body').eq('post_id', post_id)
    .eq('is_hidden', false).order('created_at', { ascending: true }).limit(10)

  // 부모 댓글 조회 (답글인 경우)
  let parentComment: { name: string; body: string } | undefined
  if (parent_id) {
    const { data: parent } = await svc.from('community_comments')
      .select('user_display_name, body').eq('id', parent_id).maybeSingle()
    if (parent) parentComment = { name: parent.user_display_name, body: parent.body }
  }

  // Gemini API 호출
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  let commentBody = ''
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: buildCommentPrompt(
        post.title,
        post.body,
        (existingComments ?? []).map((c: { user_display_name: string; body: string }) => ({ name: c.user_display_name, body: c.body })),
        parentComment,
        direction?.trim(),
        lang,
      ),
    })
    // Gemini safety block 체크
    const candidate = result.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      console.error('[ai-bot/comment] Gemini blocked:', candidate.finishReason, candidate.safetyRatings)
      throw new Error(`blocked: ${candidate.finishReason}`)
    }
    commentBody = (result.text ?? '').trim()
    if (!commentBody) throw new Error('empty')
    if (containsUnsafeContent(commentBody)) throw new Error('unsafe content')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai-bot/comment] generation error:', msg)
    return NextResponse.json({ error: 'ai_generation_failed', debug: msg }, { status: 500 })
  }

  // 댓글 저장 (포인트 차감 전에 먼저 시도 — INSERT 실패 시 포인트 손실 방지)
  const userDisplayName = (profile as { nickname?: string | null } | null)?.nickname ?? user.email?.split('@')[0] ?? 'user'
  const { data: comment, error } = await svc.from('community_comments').insert({
    post_id,
    user_id: user.id,
    user_display_name: 'Pickvolt AI',
    user_avatar_url: null,
    parent_id: parent_id ?? null,
    body: commentBody,
    is_ai_generated: true,
    ai_character: null,
    ai_requester_name: userDisplayName,
  }).select('id, body, user_display_name, user_avatar_url, parent_id, upvotes, created_at').single()

  if (error) {
    console.error('[ai-bot/comment] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // comment_count 동기화 (best-effort)
  try {
    const { count } = await svc
      .from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id)
      .eq('is_hidden', false)
    await svc.from('community_posts').update({ comment_count: count ?? 0 }).eq('id', post_id)
  } catch {}

  // 포인트 차감 (INSERT 성공 후)
  if (cost > 0 && !isAdmin) {
    await svc.from('profiles').update({ points: Math.max(0, curPoints - cost) }).eq('user_id', user.id)
    await svc.from('point_transactions').insert({
      user_id: user.id, amount: -cost, reason: 'ai_bot_comment',
    })
  }

  return NextResponse.json({
    ok: true,
    comment: { ...comment, my_vote: false, is_ai_generated: true },
    pointsUsed: cost,
    pointsLeft: Math.max(0, curPoints - cost),
  }, { status: 201 })
}
