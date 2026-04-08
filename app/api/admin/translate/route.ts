import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return false
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  return ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const prompt = `You are a product localization expert. Given a tech product name, generate natural search-friendly translations/transliterations for each language. Keep brand names and model numbers unchanged. Only translate generic words if needed.

Product name: "${name}"

Return JSON only (no markdown):
{
  "en": "English name",
  "ko": "Korean name (한글로 일반명사만 번역, 브랜드/모델명 유지)",
  "ja": "Japanese name (日本語)",
  "es": "Spanish name",
  "pt": "Portuguese name",
  "fr": "French name",
  "de": "German name"
}`

  try {
    let result: Record<string, string>

    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      const response = await ai.models.generateContent({
        model: 'gemma-4-31b-it',
        contents: prompt,
      })
      const text = response.text ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no json')
      result = JSON.parse(match[0])
    } else if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no json')
      result = JSON.parse(match[0])
    } else {
      return NextResponse.json({ error: 'AI API key not set' }, { status: 500 })
    }

    return NextResponse.json({ translations: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
