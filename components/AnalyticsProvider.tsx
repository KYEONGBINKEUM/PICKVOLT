'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'

const GA_ID = 'G-L6DE0CLZX0'
const CLARITY_ID = 'x194m0w9o7'

export default function AnalyticsProvider() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    // 초기 확인
    if (localStorage.getItem('pv_cookie_consent') === 'accepted') {
      setConsented(true)
      return
    }

    // 다른 탭/배너에서 동의 변경 감지
    const handler = () => {
      if (localStorage.getItem('pv_cookie_consent') === 'accepted') {
        setConsented(true)
      }
    }
    window.addEventListener('storage', handler)

    // 같은 탭에서 배너 동의 감지 (커스텀 이벤트)
    window.addEventListener('pv_cookie_accepted', handler)

    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('pv_cookie_accepted', handler)
    }
  }, [])

  return (
    <>
      {/* Vercel Analytics — 쿠키 동의 기반 */}
      <Analytics
        beforeSend={(event) => {
          if (localStorage.getItem('pv_cookie_consent') !== 'accepted') return null
          return event
        }}
      />

      {/* GA4 + Clarity — 동의 후에만 로드 */}
      {consented && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}</Script>
          <Script id="clarity-init" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}</Script>
        </>
      )}
    </>
  )
}
