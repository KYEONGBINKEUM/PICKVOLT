import { NextRequest, NextResponse } from 'next/server'
import { collectTechEvents } from '@/lib/collectTechEvents'

// GET /api/cron/events — weekly auto-collect from confs.tech
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await collectTechEvents()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result)
}
