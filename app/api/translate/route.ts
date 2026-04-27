import { NextRequest, NextResponse } from 'next/server'

// GET /api/translate?q=text&tl=ko
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q  = searchParams.get('q')  ?? ''
  const tl = searchParams.get('tl') ?? 'en'

  if (!q.trim()) return NextResponse.json({ text: '' })

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json({ text: q }, { status: 502 })

    const data = await res.json()
    const text = (data[0] as [string, unknown][])
      .map((seg) => seg[0] ?? '')
      .join('')

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: q }, { status: 502 })
  }
}
