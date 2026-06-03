import Parser from 'rss-parser'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { RSS_FEEDS, MAX_ITEMS_PER_FEED } from '@/lib/rss-feeds'

type CustomItem = {
  title?: string
  link?: string
  content?: string
  contentSnippet?: string
  isoDate?: string
  enclosure?: { url?: string }
  'media:content'?: { $?: { url?: string } }
  'media:thumbnail'?: { $?: { url?: string } }
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function extractThumbnail(item: CustomItem): string | null {
  const direct =
    item['media:thumbnail']?.$?.url ??
    item['media:content']?.$?.url ??
    item.enclosure?.url ??
    null
  if (direct) return direct
  // fallback: content:encoded / description HTML 안에 있는 첫 번째 img src
  if (item.content) {
    const m = item.content.match(/<img[^>]+src=["']([^"']+)["']/)
    if (m) return m[1]
  }
  return null
}

// 1~2문장 발췌 (100자 이내) + 썸네일 이미지만 저장 (출처/원문보기는 CardPost에서 렌더링)
function buildBody(thumb: string | null, snippet: string): string {
  const imgHtml = thumb
    ? `<p><img src="${thumb}" alt="" style="max-width:100%;border-radius:8px;margin-bottom:8px;" /></p>`
    : ''
  const excerptHtml = snippet
    ? `<p>${snippet}</p>`
    : ''
  return `${imgHtml}${excerptHtml}`
}

// contentSnippet을 1~2문장(100자)으로 자르기
function toShortExcerpt(raw: string | undefined): string {
  if (!raw) return ''
  const text = raw.replace(/\n+/g, ' ').trim()
  // 첫 번째 마침표/느낌표/물음표 이후 두 번째 문장 끝까지만 허용
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? []
  const twoSentences = sentences.slice(0, 2).join(' ').trim()
  const result = twoSentences || text
  return result.length > 120 ? result.slice(0, 120) + '…' : result
}

export async function GET(req: NextRequest) {
  // CRON_SECRET 미설정 시에도 반드시 차단 (환경변수 누락으로 우회되는 버그 수정)
  const secret = process.env.CRON_SECRET
  const auth = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parser = new Parser<Record<string, unknown>, CustomItem>({
    customFields: {
      item: [
        ['media:content',   'media:content'],
        ['media:thumbnail', 'media:thumbnail'],
      ],
    },
    timeout: 10_000,
  })

  const supabase = makeServiceClient()
  let inserted = 0
  let skipped  = 0
  const errors: string[] = []

  // 모든 피드를 병렬로 fetch
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map(feed => parser.parseURL(feed.url).then(r => ({ feed, items: r.items })))
  )

  for (const result of feedResults) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason))
      continue
    }

    const { feed, items } = result.value
    const candidates = items.slice(0, MAX_ITEMS_PER_FEED).filter(i => i.link && i.title)
    if (candidates.length === 0) continue

    // 배치 중복 확인 (1번 쿼리로 처리)
    const urls = candidates.map(i => i.link!)
    const { data: existingRows } = await supabase
      .from('community_posts')
      .select('source_url')
      .in('source_url', urls)

    const existingSet = new Set((existingRows ?? []).map(r => r.source_url))

    for (const item of candidates) {
      if (existingSet.has(item.link!)) { skipped++; continue }

      const thumb   = extractThumbnail(item)
      const snippet = toShortExcerpt(item.contentSnippet)
      const body    = buildBody(thumb, snippet)

      const { error } = await supabase.from('community_posts').insert({
        user_id:           null,
        user_display_name: feed.name,
        user_avatar_url:   feed.favicon ?? null,
        type:              'news',
        title:             item.title!.trim().slice(0, 200),
        body,
        source_url:        item.link!,
        source_name:       feed.name,
        is_bot:            true,
      })

      if (error) {
        if (error.code !== '23505') errors.push(`${feed.name}: ${error.message}`)
        else skipped++
      } else {
        inserted++
      }
    }
  }

  console.log(`[cron/rss] inserted=${inserted} skipped=${skipped} errors=${errors.length}`)
  return NextResponse.json({ inserted, skipped, errors })
}
