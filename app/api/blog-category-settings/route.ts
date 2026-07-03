import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BLOG_CATEGORY_SLUGS } from '@/lib/blogCategories'

const DEFAULT_VISIBLE = new Set(['mobile'])

const DEFAULT_SETTINGS = BLOG_CATEGORY_SLUGS.map((category) => ({
  category,
  is_visible: DEFAULT_VISIBLE.has(category),
}))

export const revalidate = 60

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from('blog_category_settings')
      .select('category, is_visible')

    if (error || !data?.length) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    // Merge with defaults so missing rows default to hidden (except "mobile")
    const map = new Map(data.map((r) => [r.category, r.is_visible]))
    const settings = BLOG_CATEGORY_SLUGS.map((category) => ({
      category,
      is_visible: map.has(category) ? map.get(category)! : DEFAULT_VISIBLE.has(category),
    }))

    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}
