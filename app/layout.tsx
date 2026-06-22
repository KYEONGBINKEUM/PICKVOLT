import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { I18nProvider, type Locale } from '@/lib/i18n'
import { CurrencyProvider } from '@/lib/currency'
import { CompareCartProvider } from '@/lib/compareCart'
import CookieBanner from '@/components/CookieBanner'
import CompareTray from '@/components/CompareTray'
import Footer from '@/components/Footer'
import NewsletterSignup from '@/components/NewsletterSignup'
import AnalyticsProvider from '@/components/AnalyticsProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'Pickvolt — AI-Powered Product Comparisons',
  description: 'Compare any tech product with AI — smartphones, laptops, tablets, headphones, and more. Get unbiased specs analysis and an instant verdict on the best pick.',
  keywords: ['product comparison', 'tech specs', 'ai recommendations', 'vs'],
  metadataBase: new URL('https://www.pickvolt.com'),
  alternates: {
    canonical: 'https://www.pickvolt.com',
    languages: {
      'x-default': 'https://www.pickvolt.com',
      'en':        'https://www.pickvolt.com',
      'ko':        'https://www.pickvolt.com',
      'ja':        'https://www.pickvolt.com',
      'es':        'https://www.pickvolt.com',
      'pt':        'https://www.pickvolt.com',
      'fr':        'https://www.pickvolt.com',
      'de':        'https://www.pickvolt.com',
    },
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Pickvolt',
    description: 'Compare any tech product with AI — smartphones, laptops, tablets, headphones, and more. Get unbiased specs analysis and an instant verdict on the best pick.',
    type: 'website',
    url: 'https://www.pickvolt.com',
    siteName: 'Pickvolt',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Pickvolt' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pickvolt',
    description: 'Compare any tech product with AI — smartphones, laptops, tablets, headphones, and more. Get unbiased specs analysis and an instant verdict on the best pick.',
    images: ['/opengraph-image.png'],
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.pickvolt.com/#website',
      name: 'Pickvolt',
      url: 'https://www.pickvolt.com',
      description: 'AI-powered tech product comparison platform for smartphones, laptops, and tablets.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.pickvolt.com/compare?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.pickvolt.com/#organization',
      name: 'Pickvolt',
      url: 'https://www.pickvolt.com',
      email: 'pickvolt.official@gmail.com',
      description: 'AI-powered tech product comparison — unbiased verdicts for smartphones, laptops, and tablets.',
      sameAs: [
        'https://pickvolt.blogspot.com',
        'https://x.com/pickvolt',
      ],
    },
  ],
}

const SUPPORTED_LOCALES = new Set(['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko'])

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const savedLocale = cookieStore.get('pv_locale')?.value
  const initialLocale: Locale = (savedLocale && SUPPORTED_LOCALES.has(savedLocale) ? savedLocale : 'en') as Locale

  return (
    <html lang={initialLocale} className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="-EfsApMwG2izRsMpHjN52Zr89_RnZzu_msPg3w1fsfw" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {/* AdSense script — temporarily disabled while awaiting approval
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8058893243087997"
          crossOrigin="anonymous"
        />
        */}
      </head>
      <body className="bg-background text-white antialiased">
        <I18nProvider initialLocale={initialLocale}>
          <CurrencyProvider>
            <CompareCartProvider>
              {children}
              <NewsletterSignup />
              <Footer />
              <CookieBanner />
              <CompareTray />
              <AnalyticsProvider />
            </CompareCartProvider>
          </CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
