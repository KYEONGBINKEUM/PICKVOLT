import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const BASE_URL = 'https://pickvolt.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'PICKVOLT — 여행 장소 추천, 호텔 추천, 여행 소식',
    template: '%s | PICKVOLT',
  },
  description: '국내외 여행 장소 추천, 호텔 추천, 최신 여행 소식을 전달합니다. 직접 경험한 솔직한 여행 정보만 씁니다.',
  keywords: ['여행 장소 추천', '호텔 추천', '여행 소식', '국내여행', '서울여행', '부산여행', '제주여행', '숙소 추천'],
  authors: [{ name: 'PICKVOLT' }],
  creator: 'PICKVOLT',
  openGraph: {
    siteName: 'PICKVOLT',
    locale: 'ko_KR',
    type: 'website',
    url: BASE_URL,
    title: 'PICKVOLT — 국내여행 가이드, 진짜 여행의 기준',
    description: '서울, 부산, 제주 등 국내 여행지 맛집·숙소·코스 추천. 직접 경험한 솔직한 여행 정보.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PICKVOLT 국내여행 가이드' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PICKVOLT — 국내여행 가이드',
    description: '직접 가보고 경험한 국내 여행 정보만 씁니다.',
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PICKVOLT',
  url: BASE_URL,
  description: '국내여행 가이드 — 진짜 여행의 기준',
  inLanguage: 'ko-KR',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/travel?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PICKVOLT',
  url: BASE_URL,
  logo: `${BASE_URL}/logo-color.svg`,
  sameAs: [],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
