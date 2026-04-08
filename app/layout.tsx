import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'
import { CurrencyProvider } from '@/lib/currency'
import { CompareCartProvider } from '@/lib/compareCart'
import CookieBanner from '@/components/CookieBanner'
import CompareTray from '@/components/CompareTray'
import Footer from '@/components/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'pickvolt — ai-powered product comparisons',
  description: 'compare any tech product and get an ai-powered verdict instantly.',
  keywords: ['product comparison', 'tech specs', 'ai recommendations', 'vs'],
  openGraph: {
    title: 'pickvolt',
    description: 'compare any tech product and get an ai-powered verdict instantly.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="bg-background text-white antialiased">
        <I18nProvider>
          <CurrencyProvider>
            <CompareCartProvider>
              {children}
              <Footer />
              <CookieBanner />
              <CompareTray />
            </CompareCartProvider>
          </CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
