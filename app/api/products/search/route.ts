import { NextRequest, NextResponse } from 'next/server'
import { searchProducts } from '@/lib/techspecs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '10')

  if (!q) {
    return NextResponse.json({ results: [], total: 0 })
  }

  const results = await searchProducts(q, limit)
  return NextResponse.json({ results, total: results.length })
}
