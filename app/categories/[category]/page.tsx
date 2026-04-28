import Navbar from '@/components/Navbar'
import CategoryClient from './CategoryClient'
import { notFound } from 'next/navigation'

const VALID_CATEGORIES = ['smartphone', 'laptop', 'tablet']
const BASE_URL = 'https://www.pickvolt.com'

const CATEGORY_LABELS: Record<string, string> = {
  smartphone: 'Smartphones',
  laptop: 'Laptops',
  tablet: 'Tablets',
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
        <CategoryClient category={category} />
      </main>
    </>
  )
}
