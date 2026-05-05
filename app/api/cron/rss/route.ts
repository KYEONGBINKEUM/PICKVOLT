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
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
    if (auth !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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

  for (const feed of RSS_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url)

      for (const item of result.items.slice(0, MAX_ITEMS_PER_FEED)) {
        if (!item.link || !item.title) continue

        // 중복 확인
        const { data: existing } = await supabase
          .from('community_posts')
          .select('id')
          .eq('source_url', item.link)
          .maybeSingle()

        if (existing) { skipped++; continue }

        const thumb   = extractThumbnail(item)
        const snippet = toShortExcerpt(item.contentSnippet)
        const body    = buildBody(thumb, snippet)

        const { error } = await supabase.from('community_posts').insert({
          user_id:           null,
          user_display_name: feed.name,
          user_avatar_url:   feed.favicon ?? null,
          type:              'news',
          title:             item.title.trim().slice(0, 200),
          body,
          source_url:        item.link,
          source_name:       feed.name,
          is_bot:            true,
        })

        if (error) {
          // UNIQUE 중복 등 무시
          if (error.code !== '23505') errors.push(`${feed.name}: ${error.message}`)
        } else {
          inserted++
        }
      }
    } catch (e) {
      errors.push(`${feed.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log(`[cron/rss] inserted=${inserted} skipped=${skipped} errors=${errors.length}`)
  return NextResponse.json({ inserted, skipped, errors })
}
