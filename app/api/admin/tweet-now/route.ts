import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TwitterApi } from 'twitter-api-v2'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

async function verifyAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) return null
  return user
}

const BASE_URL = 'https://www.pickvolt.com'

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const appKey    = process.env.TWITTER_API_KEY
  const appSecret = process.env.TWITTER_API_SECRET
  const accessToken       = process.env.TWITTER_ACCESS_TOKEN
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

  if (!appKey || !appSecret || !accessToken || !accessTokenSecret) {
    return NextResponse.json({ error: 'Twitter API credentials not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

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
  const compareUrl = `${BASE_URL}/compare?ids=${idA},${idB}`

  const tweetText = [
    `🔥 This week's most compared: ${pA.brand} ${pA.name} vs ${pB.brand} ${pB.name}`,
    ``,
    `Compared ${count} times on Pickvolt — see the full AI breakdown 👇`,
    compareUrl,
    ``,
    `#TechComparison #${pA.brand.replace(/\s/g, '')} #${pB.brand.replace(/\s/g, '')}`,
  ].join('\n')

  try {
    const twitter = new TwitterApi({ appKey, appSecret, accessToken, accessSecret: accessTokenSecret })
    const { data: tweet } = await twitter.readWrite.v2.tweet(tweetText)

    await supabase.from('twitter_log').insert({
      tweet_id: tweet.id,
      tweet_text: tweetText,
      tweeted_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, tweetId: tweet.id, pair: `${pA.name} vs ${pB.name}`, count })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
