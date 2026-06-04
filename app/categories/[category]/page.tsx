import Navbar from '@/components/Navbar'
import CategoryClient from './CategoryClient'
import { notFound } from 'next/navigation'

const VALID_CATEGORIES = ['smartphone', 'laptop', 'tablet', 'smartwatch', 'headphones', 'monitor', 'tv', 'car']
const BASE_URL = 'https://www.pickvolt.com'

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

const CATEGORY_LABELS: Record<string, string> = {
  smartphone: 'Smartphones',
  laptop: 'Laptops',
  tablet: 'Tablets',
  smartwatch: 'Smartwatches',
  headphones: 'Headphones & Earbuds',
  monitor: 'Monitors',
  tv: 'Televisions',
  car: 'Cars & EVs',
}

export function generateStaticParams() {
  return VALID_CATEGORIES.map((category) => ({ category }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  if (!VALID_CATEGORIES.includes(category)) notFound()

  // 초기 30개 서버사이드 fetch → 클라이언트 첫 로드 시 빈 화면 제거
  let initialData: { products: unknown[]; brands: string[]; total: number } | undefined
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/products/list?category=${category}&sort=performance&page=1&limit=30`,
      { next: { revalidate: 60 } }
    )
    if (res.ok) {
      const json = await res.json()
      initialData = { products: json.results ?? [], brands: json.brands ?? [], total: json.total ?? 0 }
    }
  } catch { /* 실패 시 클라이언트 fetch로 fallback */ }

  const label = CATEGORY_LABELS[category] ?? category
  const categorySchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: label, item: `${BASE_URL}/categories/${category}` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${label} — Pickvolt`,
        description: `Browse and compare ${label.toLowerCase()} with AI-powered verdicts.`,
        url: `${BASE_URL}/categories/${category}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }}
      />
      <Navbar showSearch />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">
        <CategoryClient category={category} initialData={initialData as Parameters<typeof CategoryClient>[0]['initialData']} />
      </main>
    </>
  )
}
