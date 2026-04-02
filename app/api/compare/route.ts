import { NextRequest, NextResponse } from 'next/server'

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
    const { products, preferences } = await req.json()

    if (!products || products.length < 2) {
      return NextResponse.json({ error: '제품을 2개 이상 선택해주세요.' }, { status: 400 })
    }

    const productList = products
      .map((p: { name: string; specs: Record<string, unknown> }) =>
        `- ${p.name}: ${JSON.stringify(p.specs)}`
      )
      .join('\n')

    const prefText = preferences
      ? `User priorities: budget sensitivity ${preferences.budget}/5, photography ${preferences.photography}/5, performance ${preferences.performance}/5, battery life ${preferences.battery}/5.`
      : ''

    const prompt = PROMPT_TEMPLATE(productList, prefText)

    // 사용 가능한 API 키에 따라 자동 선택
    // Gemini 우선 (키가 있으면), 없으면 Claude
    let result
    if (process.env.GEMINI_API_KEY) {
      result = await runWithGemini(prompt)
    } else if (process.env.ANTHROPIC_API_KEY) {
      result = await runWithClaude(prompt)
    } else {
      return NextResponse.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    return NextResponse.json({ ...result, provider: process.env.GEMINI_API_KEY ? 'gemini' : 'claude' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('compare api error:', msg)
    return NextResponse.json({ error: '비교 분석에 실패했습니다.', detail: msg }, { status: 500 })
  }
}
