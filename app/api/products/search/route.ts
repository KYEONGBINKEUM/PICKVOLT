import { NextRequest, NextResponse } from 'next/server'

const TECHSPECS_BASE = 'https://api.techspecs.io/v5'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '10')

  if (!q) {
    return NextResponse.json({ results: [], total: 0 })
  }

  const res = await fetch(
    `${TECHSPECS_BASE}/products/search?query=${encodeURIComponent(q)}`,
    {
      headers: {
        'X-API-KEY': process.env.TECHSPECS_API_KEY!,
        'X-API-ID': process.env.TECHSPECS_APP_ID!,
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'TechSpecs API 오류' }, { status: res.status })
  }

  const data = await res.json()

  // 동일 모델명 중복 제거 (버전만 다른 경우)
  const seen = new Set<string>()
  const deduped = (data.data ?? []).filter((item: { Product: { Model: string } }) => {
    const model = item.Product.Model
    if (seen.has(model)) return false
    seen.add(model)
    return true
  })

  const results = deduped.slice(0, limit).map((item: {
    Product: { id: string; Model: string; Brand: string; Category: string; Thumbnail?: string }
    'Release Date'?: string
  }) => ({
    id: item.Product.id,
    name: item.Product.Model,
    brand: item.Product.Brand,
    category: item.Product.Category,
    thumbnail: item.Product.Thumbnail ?? '',
    releaseDate: item['Release Date'] ?? '',
  }))

  return NextResponse.json({ results, total: results.length })
}
