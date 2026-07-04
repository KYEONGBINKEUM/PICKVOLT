'use client'

import { useI18n } from '@/lib/i18n'

export default function PrivacyContent() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t('privacy.label')}</p>
      <h1 className="text-4xl font-black text-white mb-2">{t('privacy.title')}</h1>
      <p className="text-xs text-white/30 mb-10">{t('privacy.updated')}</p>

      <div className="space-y-8 text-sm text-white/60 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('privacy.s1_title')}</h2>
          <p>{t('privacy.s1_intro')}</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-white/50">
            <li>{t('privacy.s1_item1')}</li>
            <li>{t('privacy.s1_item2')}</li>
            <li>{t('privacy.s1_item3')}</li>
            <li>{t('privacy.s1_item4')}</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('privacy.s2_title')}</h2>
          <p>{t('privacy.s2_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('privacy.s3_title')}</h2>
          <p>{t('privacy.s3_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('privacy.s4_title')}</h2>
          <p>{t('privacy.s4_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('privacy.s5_title')}</h2>
          <p>{t('privacy.s5_body')}</p>
        </section>
      </div>
    </div>
  )
}
