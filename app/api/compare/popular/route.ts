import { NextResponse } from 'next/server'
import { getPopularComparisons } from '@/lib/getPopularComparisons'

export async function GET() {
  const items = await getPopularComparisons()
  const res = NextResponse.json({ items })
  res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  return res
}
