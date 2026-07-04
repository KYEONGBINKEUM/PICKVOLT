import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALL_CATEGORIES = ['smartphone', 'laptop', 'tablet', 'smartwatch', 'headphones', 'monitor', 'tv', 'car']

const DEFAULT_SETTINGS = ALL_CATEGORIES.map((category) => ({ category, is_visible: true }))

export const revalidate = 60

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from('category_settings')
      .select('category, is_visible')

    if (error || !data?.length) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    // Merge with defaults so missing rows default to visible
    const map = new Map(data.map((r) => [r.category, r.is_visible]))
    const settings = ALL_CATEGORIES.map((category) => ({
      category,
      is_visible: map.has(category) ? map.get(category)! : true,
    }))

    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}
