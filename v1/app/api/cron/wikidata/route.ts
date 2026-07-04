import { NextRequest, NextResponse } from 'next/server'
import { collectWikidataProducts } from '@/lib/collectWikidata'

// GET /api/cron/wikidata — weekly Wikidata product collection
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const results = await collectWikidataProducts()
  return NextResponse.json({ results })
}
