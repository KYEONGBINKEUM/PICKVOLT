import { NextResponse } from 'next/server'
import { getPopularComparisons } from '@/lib/getPopularComparisons'

export async function GET() {
  try {
    const items = await getPopularComparisons()
    const res = NextResponse.json({ items })
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res
  } catch (e) {
    console.error('[popular] error:', e)
    return NextResponse.json({ items: [] })
  }
}
