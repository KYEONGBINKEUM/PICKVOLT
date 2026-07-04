import type { Metadata } from 'next'
import { Inter, Noto_Serif_KR } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { I18nProvider, type Locale } from '@/lib/i18n'
import { CurrencyProvider } from '@/lib/currency'
import { CompareCartProvider } from '@/lib/compareCart'
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'
import AnalyticsProvider from '@/components/AnalyticsProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Pickvolt — IT News & Insights',
  description: 'Pickvolt covers the latest IT news across AI, mobile, hardware, software, and more — curated and updated daily.',
  keywords: ['IT news', 'tech news', 'AI news', 'mobile news', 'technology'],
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
    title: 'Pickvolt — IT News & Insights',
    description: 'Pickvolt covers the latest IT news across AI, mobile, hardware, software, and more — curated and updated daily.',
    type: 'website',
    url: 'https://www.pickvolt.com',
    siteName: 'Pickvolt',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Pickvolt' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pickvolt — IT News & Insights',
    description: 'Pickvolt covers the latest IT news across AI, mobile, hardware, software, and more — curated and updated daily.',
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
      description: 'IT news and insights covering AI, mobile, hardware, software, and more.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.pickvolt.com/community/search?q={search_term_string}',
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
      description: 'Pickvolt is an IT news outlet covering AI, mobile, hardware, software, and more.',
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
    <html lang={initialLocale} className={`${inter.variable} ${notoSerifKr.variable}`} suppressHydrationWarning>
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
      </head>
      <body className="antialiased" style={{ background: '#0E0E0E', color: '#EDEDED' }}>
        <I18nProvider initialLocale={initialLocale}>
          <CurrencyProvider>
            <CompareCartProvider>
              {children}
              <Footer />
              <CookieBanner />
              <AnalyticsProvider />
            </CompareCartProvider>
          </CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
