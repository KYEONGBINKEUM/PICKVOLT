'use client'

import { useI18n } from '@/lib/i18n'

export default function CookiesContent() {
  const { t } = useI18n()

  const cookieTypes = [
    { typeKey: 'cookies.essential_type', descKey: 'cookies.essential_desc', required: true },
    { typeKey: 'cookies.functional_type', descKey: 'cookies.functional_desc', required: false },
    { typeKey: 'cookies.analytics_type', descKey: 'cookies.analytics_desc', required: false },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t('cookies.label')}</p>
      <h1 className="text-4xl font-black text-white mb-2">{t('cookies.title')}</h1>
      <p className="text-xs text-white/30 mb-10">{t('cookies.updated')}</p>

      <div className="space-y-8 text-sm text-white/60 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('cookies.s1_title')}</h2>
          <p>{t('cookies.s1_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('cookies.s2_title')}</h2>
          <div className="space-y-4">
            {cookieTypes.map(({ typeKey, descKey, required }) => (
              <div key={typeKey} className="flex items-start justify-between gap-4 p-4 bg-surface border border-border rounded-card">
                <div>
                  <p className="text-sm font-bold text-white mb-1">{t(typeKey as Parameters<typeof t>[0])}</p>
                  <p className="text-xs text-white/40">{t(descKey as Parameters<typeof t>[0])}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  required ? 'bg-white/10 text-white/50' : 'bg-accent/10 text-accent'
                }`}>
                  {required ? t('cookies.required_badge') : t('cookies.optional_badge')}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('cookies.s3_title')}</h2>
          <p>{t('cookies.s3_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('cookies.s4_title')}</h2>
          <p>{t('cookies.s4_body')}</p>
        </section>
      </div>
    </div>
  )
}
