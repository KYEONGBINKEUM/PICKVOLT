import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: {
    default: 'PICKVOLT — 대한민국 여행 가이드',
    template: '%s | PICKVOLT',
  },
  description: '국내외 여행지 정보, 맛집, 숙소, 코스 추천. 직접 경험한 여행 가이드.',
  keywords: ['여행', '국내여행', '여행지 추천', '맛집', '숙소'],
  openGraph: {
    siteName: 'PICKVOLT',
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
