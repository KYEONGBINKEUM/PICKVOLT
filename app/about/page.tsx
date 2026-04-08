import Navbar from '@/components/Navbar'
import AboutContent from './AboutContent'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — pickvolt',
  description: 'Learn about pickvolt, the AI-powered tech product comparison platform that helps you make smarter buying decisions.',
}

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About — Pickvolt',
  url: 'https://www.pickvolt.com/about',
  description: 'Learn about Pickvolt, the AI-powered tech product comparison platform.',
  publisher: {
    '@type': 'Organization',
    name: 'Pickvolt',
    url: 'https://www.pickvolt.com',
  },
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <AboutContent />
      </main>
    </>
  )
}
