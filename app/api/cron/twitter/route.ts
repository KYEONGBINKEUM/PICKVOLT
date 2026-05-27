import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildTweetText } from '@/lib/buildTweetText'
import { postTweet } from '@/lib/twitterOAuth'

export const maxDuration = 30

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * GET /api/cron/twitter
 * 매일 오전 9시(UTC) 실행 — 지난 7일 가장 많이 비교된 제품 페어를 트윗
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiKey            = process.env.TWITTER_API_KEY
  const apiSecret         = process.env.TWITTER_API_SECRET
  const accessToken       = process.env.TWITTER_ACCESS_TOKEN
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return NextResponse.json({ error: 'Twitter credentials not configured' }, { status: 500 })
  }

  const supabase = makeSupabase()

  // 오늘 이미 트윗했으면 스킵
  const { data: lastLog } = await supabase
    .from('twitter_log')
    .select('tweeted_at')
    .order('tweeted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastLog) {
    const hoursSince = (Date.now() - new Date(lastLog.tweeted_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince < 20) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already tweeted today' })
    }
  }

  // 지난 7일 가장 많이 비교된 페어
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentHistory } = await supabase
    .from('comparison_history')
    .select('products')
    .gte('created_at', since)

  if (!recentHistory || recentHistory.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no comparisons this week' })
  }

  const pairMap = new Map<string, number>()
  for (const row of recentHistory) {
    const ids: string[] = row.products ?? []
    if (ids.length < 2) continue
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join(',')
        pairMap.set(key, (pairMap.get(key) ?? 0) + 1)
      }
    }
  }

  if (pairMap.size === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no pairs found' })
  }

  const [topPair, count] = Array.from(pairMap.entries()).sort((a, b) => b[1] - a[1])[0]
  const [idA, idB] = topPair.split(',')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand')
    .in('id', [idA, idB])
    .eq('is_visible', true)

  if (!products || products.length < 2) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'products not found' })
  }

  const pA = products.find((p) => p.id === idA) ?? products[0]
  const pB = products.find((p) => p.id === idB) ?? products[1]
  const tweetText = buildTweetText(pA, pB, count)

  try {
    const tweet = await postTweet(tweetText, { apiKey, apiSecret, accessToken, accessTokenSecret })

    await supabase.from('twitter_log').insert({
      tweet_id: tweet.id,
      tweet_text: tweetText,
      tweeted_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, tweetId: tweet.id, pair: `${pA.name} vs ${pB.name}`, count })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[cron/twitter] tweet failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
