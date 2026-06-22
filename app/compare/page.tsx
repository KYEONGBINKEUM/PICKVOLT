import type { Metadata } from 'next'
import { Suspense } from 'react'
import CompareClient from './CompareClient'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://www.pickvolt.com'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}): Promise<Metadata> {
  const { ids } = await searchParams
  const idList = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
  const sortedIds = [...idList].sort()

  let productNames: string[] = []
  if (idList.length > 0) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data } = await supabase
        .from('products')
        .select('name')
        .in('id', idList)
      productNames = (data ?? []).map((p: { name: string }) => p.name)
    } catch {
      // fallback to generic
    }
  }

  const title = productNames.length >= 2
    ? `${productNames.slice(0, 2).join(' vs ')} — Pickvolt`
    : 'Compare Products — Pickvolt'
  const description = productNames.length >= 2
    ? `Side-by-side AI comparison: ${productNames.join(', ')}. Specs, scores, and the best pick.`
    : 'Compare smartphones, laptops, and tablets side by side with AI-powered analysis.'

  const ogParams = new URLSearchParams({ type: 'compare' })
  productNames.forEach((name) => ogParams.append('p', name))
  const ogImageUrl = `${BASE_URL}/api/og?${ogParams.toString()}`

  const canonicalUrl = sortedIds.length > 0
    ? `${BASE_URL}/compare?ids=${sortedIds.join(',')}`
    : `${BASE_URL}/compare`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url:      canonicalUrl,
      siteName: 'Pickvolt',
      images:   [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type:     'website',
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImageUrl],
    },
  }
}

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareLoading />}>
      <CompareClient />
    </Suspense>
  )
}

function CompareLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-white/40">loading comparison...</p>
      </div>
    </div>
  )
}
