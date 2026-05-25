import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { shortenProductName } from '@/lib/utils'

const GUEST_AI_COOKIE = 'pv_guest_ai'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const LOCALE_LANG: Record<string, string> = {
  en: 'English', ko: '한국어', ja: '日本語', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch',
}

const PROMPT_TEMPLATE = (productList: string, prefText: string, lang: string) =>
`You are a tech product comparison expert. Compare the following products and pick a winner.

Products:
${productList}

${prefText}

IMPORTANT: Write the "summary" and "reasoning" fields in ${lang}. Keep "winner" as the exact product name.

Respond with JSON only:
{
  "winner": "product name",
  "summary": "one sentence why this product wins (conversational tone, in ${lang})",
  "reasoning": "2-3 sentences of detailed reasoning (in ${lang})",
  "scores": {
    "product_name": { "value": 0-100, "reason": "brief reason in ${lang}" }
  }
}`

function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('no json in response')
  return JSON.parse(match[0])
}

async function runWithGemini(prompt: string) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return extractJSON(text)
}

async function runWithClaude(prompt: string) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return extractJSON(text)
}

export async function POST(req: NextRequest) {
  try {
    const { products, preferences, accessToken, productIds, locale } = await req.json()
    const lang = LOCALE_LANG[locale] ?? 'English'

    if (!products || products.length < 2) {
      return NextResponse.json({ error: '제품을 2개 이상 선택해주세요.' }, { status: 400 })
    }

    // ── 게스트 무료 체험 처리 ────────────────────────────────────────────────
    const isGuest = !accessToken
    if (isGuest) {
      const cookieStore = await cookies()
      const guestUsed = cookieStore.get(GUEST_AI_COOKIE)?.value
      if (guestUsed === '1') {
        // 이미 체험 사용 → 로그인 유도
        return NextResponse.json({ error: 'login_required', guestUsed: true }, { status: 401 })
      }
      // 첫 방문 → AI 실행 후 쿠키 세팅해 반환 (히스토리/포인트 차감 없음)
      const productList = products
        .map((p: { name: string; specs: Record<string, unknown> }) => `- ${p.name}: ${JSON.stringify(p.specs)}`)
        .join('\n')
      const prefText = preferences
        ? `User priorities: budget sensitivity ${preferences.budget}/5, photography ${preferences.photography}/5, performance ${preferences.performance}/5, battery life ${preferences.battery}/5.`
        : ''
      const prompt = PROMPT_TEMPLATE(productList, prefText, lang)
      const MAX_RETRIES = 3
      let guestResult; let lastErr: unknown
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          guestResult = process.env.GEMINI_API_KEY ? await runWithGemini(prompt) : await runWithClaude(prompt)
          break
        } catch (e) {
          lastErr = e
          if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
      if (!guestResult) throw lastErr

      // verdict upsert (best-effort)
      try {
        if ((productIds ?? []).length === 2 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const adminSb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
          const sorted = [...(productIds as string[])].sort()
          await adminSb.rpc('upsert_comparison_verdict', {
            p_pair_key: sorted.join(':'), p_product_ids: sorted,
            p_winner_name: guestResult.winner ?? null, p_summary: guestResult.summary ?? null,
          })
        }
      } catch {}

      const res = NextResponse.json({
        ...guestResult,
        provider: process.env.GEMINI_API_KEY ? 'gemini' : 'claude',
        guestTrial: true,
      })
      res.cookies.set(GUEST_AI_COOKIE, '1', {
        maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true,
      })
      return res
    }

    // ── 로그인 유저 처리 ──────────────────────────────────────────────────────
    // 유저 토큰으로 인증된 Supabase 클라이언트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

    // 구독 상태 / 어드민 확인
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')
    const isPro = isAdmin || sub?.status === 'pro'

    // 포인트 확인 (Pro / 어드민 제외)
    let currentPoints = 0
    if (!isPro) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('user_id', user.id)
        .maybeSingle()
      currentPoints = profile?.points ?? 0

      if (currentPoints < 1) {
        return NextResponse.json({ error: 'no_points', points: 0 }, { status: 402 })
      }
    }

    // AI 호출
    const productList = products
      .map((p: { name: string; specs: Record<string, unknown> }) =>
        `- ${p.name}: ${JSON.stringify(p.specs)}`
      )
      .join('\n')

    const prefText = preferences
      ? `User priorities: budget sensitivity ${preferences.budget}/5, photography ${preferences.photography}/5, performance ${preferences.performance}/5, battery life ${preferences.battery}/5.`
      : ''

    const prompt = PROMPT_TEMPLATE(productList, prefText, lang)

    const MAX_RETRIES = 3
    let result
    let lastError: unknown
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (process.env.GEMINI_API_KEY) {
          result = await runWithGemini(prompt)
        } else if (process.env.ANTHROPIC_API_KEY) {
          result = await runWithClaude(prompt)
        } else {
          return NextResponse.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 })
        }
        break
      } catch (e) {
        lastError = e
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
    }
    if (!result) throw lastError

    // 히스토리 서버사이드 저장
    const title = products.map((p: { name: string }) => shortenProductName(p.name)).join(' vs ')
    await supabase.from('comparison_history').insert({
      user_id: user.id,
      title,
      products: productIds ?? [],
      result: {
        winner: result.winner,
        summary: result.summary,
        reasoning: result.reasoning,
        scores: result.scores ?? {},
      },
      pinned: false,
    })

    // 누적 verdict upsert (2개 비교일 때만) — 실패해도 비교 결과에 영향 없음
    try {
      if ((productIds ?? []).length === 2) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
          )
          const sortedIds = [...(productIds as string[])].sort()
          const pairKey = sortedIds.join(':')
          await adminSupabase.rpc('upsert_comparison_verdict', {
            p_pair_key:    pairKey,
            p_product_ids: sortedIds,
            p_winner_name: result.winner ?? null,
            p_summary:     result.summary ?? null,
          })
        }
      }
    } catch (e) {
      console.warn('[verdict] upsert skipped:', e)
    }

    // 포인트 차감 (Pro / 어드민 제외) — AI 성공 후 원자적으로 차감
    let newPoints: number | null = null
    if (!isPro) {
      const { data: deductResult } = await supabase.rpc('use_ai_point')
      // use_ai_point() 는 차감 후 잔여 포인트(INT) 또는 NULL(포인트 부족) 반환
      newPoints = typeof deductResult === 'number' ? deductResult : currentPoints - 1
    }

    return NextResponse.json({
      ...result,
      provider: process.env.GEMINI_API_KEY ? 'gemini' : 'claude',
      points: newPoints,
      isPro,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('compare api error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
