import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import HomeHeading from './HomeHeading'
import TrendingSection from './TrendingSection'
import HomeCommunityFeed from './HomeCommunityFeed'
import HomeFaq from './HomeFaq'
import { getPopularComparisons } from '@/lib/getPopularComparisons'

export const revalidate = 30

const homeFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is Pickvolt?', acceptedAnswer: { '@type': 'Answer', text: 'Pickvolt is an AI-powered tech product comparison platform. Compare smartphones, laptops, tablets, and more to find the best fit for you.' } },
    { '@type': 'Question', name: 'How does the comparison work?', acceptedAnswer: { '@type': 'Answer', text: 'Select two or more products and Pickvolt will analyze specs, performance scores, and pricing to give you an objective verdict.' } },
    { '@type': 'Question', name: 'Is Pickvolt free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Core comparison features are completely free. Create an account to save comparisons and join the community.' } },
    { '@type': 'Question', name: 'How often is product data updated?', acceptedAnswer: { '@type': 'Answer', text: 'Specs and pricing are updated regularly. Community news is refreshed daily via curated sources.' } },
    { '@type': 'Question', name: 'Can I write a review or ask questions?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sign in and head to the Community section to write reviews, ask questions, or share your experience.' } },
  ],
}

const homeHowToSpeakableSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'HowTo',
      name: 'How to Compare Tech Products on Pickvolt',
      description: 'Step-by-step guide to comparing smartphones, laptops, and tablets with AI-powered analysis.',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Search for a product', text: 'Type the product name or model number in the search bar and select from the autocomplete suggestions.' },
        { '@type': 'HowToStep', position: 2, name: 'Add to compare tray', text: 'Click the compare button on any product card to add it to your tray. You can add up to 4 products at once.' },
        { '@type': 'HowToStep', position: 3, name: 'Get the AI verdict', text: 'Open the comparison page to see a side-by-side spec breakdown, performance scores, and an AI-generated recommendation tailored to your needs.' },
      ],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://www.pickvolt.com/#webpage',
      url: 'https://www.pickvolt.com',
      name: 'Pickvolt — AI-Powered Product Comparisons',
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', 'details p'],
      },
    },
  ],
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const trending = await getPopularComparisons()

  return (
    <main className="bg-background flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeHowToSpeakableSchema) }} />
      <Navbar />
      {/* 히어로: 뷰포트 전체 높이, 커뮤니티 피드는 스크롤 후 노출 */}
      <div className="min-h-[calc(100svh-64px)] flex flex-col items-center justify-center px-6 pt-16 pb-12 gap-10">
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          <HomeHeading />
          <SearchBar initialQuery={q ?? ''} />
        </div>
        {trending.length > 0 && (
          <div className="w-full max-w-4xl">
            <TrendingSection items={trending} />
          </div>
        )}
      </div>
      <HomeCommunityFeed />
      <HomeFaq />
    </main>
  )
}
