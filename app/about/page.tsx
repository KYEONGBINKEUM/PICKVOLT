import Navbar from '@/components/Navbar'
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
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">about</p>
          <h1 className="text-4xl font-black text-white mb-6">We help you pick better.</h1>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <p>
                Pickvolt is an AI-powered product comparison platform built for people who care about making the right tech purchases. We cut through spec sheets and marketing noise so you can focus on what actually matters.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-3">What we do</h2>
              <p>
                Enter any two products — smartphones, laptops, tablets — and our AI instantly analyzes their specs, benchmarks, and real-world trade-offs to give you a clear, unbiased verdict. No ads. No affiliate links. Just honest comparisons.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-3">Why we built it</h2>
              <p>
                Buying tech shouldn't require hours of research across a dozen browser tabs. We built pickvolt because we were tired of comparison sites optimized for clicks instead of clarity. Our goal is to give you the answer in seconds, not hours.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-3">How it works</h2>
              <ul className="space-y-2 list-disc list-inside text-white/50">
                <li>We maintain a curated database of tech product specifications</li>
                <li>AI models analyze and compare specs, performance benchmarks, and value</li>
                <li>You get a clear verdict with reasoning — not just a winner, but why</li>
                <li>Pro users can save and revisit comparisons over time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-3">Get in touch</h2>
              <p>
                Have a question, suggestion, or just want to say hello? We&apos;d love to hear from you.{' '}
                <a href="/contact" className="text-white underline underline-offset-2 hover:text-white/70 transition-colors">
                  Contact us
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
