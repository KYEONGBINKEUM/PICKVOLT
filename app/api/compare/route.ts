import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { shortenProductName } from '@/lib/utils'

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
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const response = await ai.models.generateContent({
    model: 'gemma-4-31b-it',
    contents: prompt,
  })
  return extractJSON(response.text ?? '')
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

    // AI 호출 (로그인 불필요, 무제한)
    const productList = products
      .map((p: { name: string; specs: Record<string, unknown> }) =>
        `- ${p.name}: ${JSON.stringify(p.specs)}`
      )
      .join('\n')

    const prefText = preferences
      ? `User priorities: budget sensitivity ${preferences.budget}/5, photography ${preferences.photography}/5, performance ${preferences.performance}/5, battery life ${preferences.battery}/5.`
      : ''

    const prompt = PROMPT_TEMPLATE(productList, prefText, lang)

    let result
    if (process.env.GEMINI_API_KEY) {
      result = await runWithGemini(prompt)
    } else if (process.env.ANTHROPIC_API_KEY) {
      result = await runWithClaude(prompt)
    } else {
      return NextResponse.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    // 로그인 유저라면 히스토리 저장
    if (accessToken) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const title = products.map((p: { name: string }) => shortenProductName(p.name)).join(' vs ')
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
      }
    }

    return NextResponse.json({
      ...result,
      provider: process.env.GEMINI_API_KEY ? 'gemini' : 'claude',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('compare api error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
