'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function AboutContent() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t('about.label')}</p>
      <h1 className="text-4xl font-black text-white mb-6">{t('about.title')}</h1>

      <div className="space-y-8 text-sm text-white/60 leading-relaxed">
        <section>
          <p>{t('about.intro')}</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('about.what_title')}</h2>
          <p>{t('about.what_body')}</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('about.why_title')}</h2>
          <p>{t('about.why_body')}</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('about.how_title')}</h2>
          <ul className="space-y-2 list-disc list-inside text-white/50">
            <li>{t('about.how_1')}</li>
            <li>{t('about.how_2')}</li>
            <li>{t('about.how_3')}</li>
            <li>{t('about.how_4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('about.contact_title')}</h2>
          <p>
            {t('about.contact_body')}{' '}
            <Link href="/contact" className="text-white underline underline-offset-2 hover:text-white/70 transition-colors">
              {t('about.contact_link')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
