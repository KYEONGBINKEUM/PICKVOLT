import Navbar from '@/components/Navbar'
import CategoryClient from './CategoryClient'
import { notFound } from 'next/navigation'

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
        <CategoryClient category={category} />
      </main>
    </>
  )
}
