import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.rpc('get_popular_comparisons')

    if (error) {
      console.error('[popular] rpc error:', error.message)
      return NextResponse.json({ items: [] })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    console.error('[popular] error:', e)
    return NextResponse.json({ items: [] })
  }
}
