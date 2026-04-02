import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DAILY_LIMIT = 5

const PROMPT_TEMPLATE = (productList: string, prefText: string) => `You are a tech product comparison expert. Compare the following products and pick a winner.

Products:
${productList}

${prefText}

Respond with JSON only:
{
  "winner": "product name",
  "summary": "one sentence why this product wins (lowercase, conversational)",
  "reasoning": "2-3 sentences of detailed reasoning (lowercase)",
  "scores": {
    "product_name": { "value": 0-100, "reason": "brief reason" }
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
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
    const { products, preferences, accessToken, productIds } = await req.json()

    if (!products || products.length < 2) {
      return NextResponse.json({ error: '제품을 2개 이상 선택해주세요.' }, { status: 400 })
    }

    // 로그인 필수
    if (!accessToken) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

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

    // 구독 상태 확인
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
    const isPro = sub?.status === 'pro'

    // 무료 유저 하루 5회 제한
    let todayCount = 0
    if (!isPro) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('comparison_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())
      todayCount = count ?? 0

      if (todayCount >= DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'daily_limit', remaining: 0 },
          { status: 429 }
        )
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

    const prompt = PROMPT_TEMPLATE(productList, prefText)

    let result
    if (process.env.GEMINI_API_KEY) {
      result = await runWithGemini(prompt)
    } else if (process.env.ANTHROPIC_API_KEY) {
      result = await runWithClaude(prompt)
    } else {
      return NextResponse.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    // 히스토리 서버사이드 저장
    const title = products.map((p: { name: string }) => p.name).join(' vs ')
    await supabase.from('comparison_history').insert({
      user_id: user.id,
      title,
      products: productIds ?? [],
      result: {
        winner: result.winner,
        summary: result.summary,
        reasoning: result.reasoning,
      },
      pinned: false,
    })

    const remaining = isPro ? null : Math.max(0, DAILY_LIMIT - (todayCount + 1))

    return NextResponse.json({
      ...result,
      provider: process.env.GEMINI_API_KEY ? 'gemini' : 'claude',
      remaining,
      isPro,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('compare api error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
