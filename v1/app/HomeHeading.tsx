'use client'

import { useI18n } from '@/lib/i18n'

export default function HomeHeading() {
  const { t } = useI18n()
  return (
    <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
      {t('home.heading')}
    </h1>
  )
}
