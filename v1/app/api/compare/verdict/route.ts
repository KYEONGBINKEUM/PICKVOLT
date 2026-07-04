import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const pair = req.nextUrl.searchParams.get('pair') ?? ''
  if (!pair) return NextResponse.json({ verdict: null })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('comparison_verdicts')
    .select('winner_name, summary, comparison_count')
    .eq('pair_key', pair)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ verdict: null })

  return NextResponse.json({
    verdict: {
      winnerName:  data.winner_name,
      summary:     data.summary,
      count:       data.comparison_count,
    },
  })
}
