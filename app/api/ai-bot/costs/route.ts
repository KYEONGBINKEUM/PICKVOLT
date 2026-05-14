import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/ai-bot/costs — public, no auth required
export async function GET() {
  try {
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: rows } = await svc.from('app_settings').select('key, value')
      .in('key', ['ai_bot_post_points', 'ai_bot_comment_points'])
    const sm: Record<string, string> = Object.fromEntries((rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
    return NextResponse.json({
      postPoints:    parseInt(sm['ai_bot_post_points']    ?? '50'),
      commentPoints: parseInt(sm['ai_bot_comment_points'] ?? '20'),
    })
  } catch {
    return NextResponse.json({ postPoints: 50, commentPoints: 20 })
  }
}
