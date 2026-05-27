import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TwitterApi } from 'twitter-api-v2'

export const maxDuration = 30

const BASE_URL = 'https://www.pickvolt.com'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function makeTwitter() {
  const appKey    = process.env.TWITTER_API_KEY
  const appSecret = process.env.TWITTER_API_SECRET
  const accessToken       = process.env.TWITTER_ACCESS_TOKEN
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET
  if (!appKey || !appSecret || !accessToken || !accessTokenSecret) return null
  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret: accessTokenSecret })
}

/** 오늘 이미 트윗했는지 확인하기 위해 DB에 기록 */
async function getLastTweetedAt(supabase: ReturnType<typeof makeSupabase>): Promise<Date | null> {
  const { data } = await supabase
    .from('twitter_log')
    .select('tweeted_at')
    .order('tweeted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? new Date(data.tweeted_at) : null
}

async function logTweet(
  supabase: ReturnType<typeof makeSupabase>,
  tweetId: string,
  text: string,
) {
  await supabase.from('twitter_log').insert({
    tweet_id: tweetId,
    tweet_text: text,
    tweeted_at: new Date().toISOString(),
  })
}

/**
 * GET /api/cron/twitter
 * 매일 오전 9시(UTC) 실행 — 지난 7일 가장 많이 비교된 제품 페어를 트윗
 */
export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const twitter = makeTwitter()
  if (!twitter) {
    return NextResponse.json({ error: 'Twitter API credentials not configured' }, { status: 500 })
  }

  const supabase = makeSupabase()

  // 오늘 이미 트윗했으면 스킵
  const lastTweet = await getLastTweetedAt(supabase)
  if (lastTweet) {
    const hoursSince = (Date.now() - lastTweet.getTime()) / (1000 * 60 * 60)
    if (hoursSince < 20) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already tweeted today' })
    }
  }

  // 지난 7일 가장 많이 비교된 페어 찾기
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentHistory } = await supabase
    .from('comparison_history')
    .select('products')
    .gte('created_at', since)

  if (!recentHistory || recentHistory.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no comparisons this week' })
  }

  // 페어별 빈도 집계
  const pairMap = new Map<string, number>()
  for (const row of recentHistory) {
    const ids: string[] = row.products ?? []
    if (ids.length < 2) continue
    // 모든 페어 조합
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

  // 가장 많이 비교된 페어
  const [topPair, count] = Array.from(pairMap.entries())
    .sort((a, b) => b[1] - a[1])[0]

  const [idA, idB] = topPair.split(',')

  // 제품 이름 조회
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

  const compareUrl = `${BASE_URL}/compare?ids=${idA},${idB}`

  // 트윗 문구 (280자 이하)
  const tweetText = [
    `🔥 This week's most compared: ${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
    ``,
    `Compared ${count} times on Pickvolt — see the full AI breakdown 👇`,
    compareUrl,
    ``,
    `#TechComparison #${pA.brand.replace(/\s/g,'')} #${pB.brand.replace(/\s/g,'')}`,
  ].join('\n')

  try {
    const rwClient = twitter.readWrite
    const { data: tweet } = await rwClient.v2.tweet(tweetText)

    await logTweet(supabase, tweet.id, tweetText)

    return NextResponse.json({
      ok: true,
      tweetId: tweet.id,
      pair: `${pA.name} vs ${pB.name}`,
      count,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[cron/twitter] tweet failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
