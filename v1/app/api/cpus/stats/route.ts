import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 1시간 캐시 — 새 칩셋 추가 후 자동 반영
export const revalidate = 3600

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('cpus')
    .select('gb6_single, gb6_multi, tdmark_score, antutu_score, cinebench_single, cinebench_multi, passmark_single, passmark_multi')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxOf = (key: string): number =>
    data && data.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? Math.max(0, ...data.map((c: any) => Number(c[key] ?? 0)).filter((v: number) => v > 0))
      : 0

  return NextResponse.json({
    gb6Single:       maxOf('gb6_single'),
    gb6Multi:        maxOf('gb6_multi'),
    tdmark:          maxOf('tdmark_score'),
    antutu:          maxOf('antutu_score'),
    cinebenchSingle: maxOf('cinebench_single'),
    cinebenchMulti:  maxOf('cinebench_multi'),
    passmarkSingle:  maxOf('passmark_single'),
    passmarkMulti:   maxOf('passmark_multi'),
  })
}
