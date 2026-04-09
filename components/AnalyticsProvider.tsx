'use client'

import { Analytics } from '@vercel/analytics/next'

export default function AnalyticsProvider() {
  return (
    <Analytics
      beforeSend={() => {
        const consent = localStorage.getItem('pv_cookie_consent')
        if (consent !== 'accepted') return null
        return undefined
      }}
    />
  )
}
