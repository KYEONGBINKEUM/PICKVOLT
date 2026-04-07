import Navbar from '@/components/Navbar'
import CategoryClient from './CategoryClient'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const VALID_CATEGORIES = ['smartphone', 'laptop', 'tablet']

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

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            카테고리
          </Link>
        </div>
        <CategoryClient category={category} />
      </main>
    </>
  )
}
