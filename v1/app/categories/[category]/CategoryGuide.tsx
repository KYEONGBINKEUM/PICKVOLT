'use client'

import { useI18n } from '@/lib/i18n'

interface GuideContent {
  heading: string
  sections: { title: string; body: string }[]
  faqs: { q: string; a: string }[]
}

export default function CategoryGuide({ guide }: { guide: GuideContent }) {
  const { t } = useI18n()

  return (
    <section className="mt-16 border-t border-border/40 pt-12">
      <h2 className="text-xl font-black text-white mb-8">{guide.heading}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {guide.sections.map((s) => (
          <div key={s.title} className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">
          {t('faq.heading')}
        </h3>
        {guide.faqs.map((faq) => (
          <details
            key={faq.q}
            className="group bg-surface border border-border rounded-2xl overflow-hidden"
          >
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
              <span className="text-sm font-semibold text-white/80 group-open:text-white pr-4">{faq.q}</span>
              <span className="text-white/30 group-open:rotate-45 transition-transform duration-200 flex-shrink-0 text-lg leading-none">+</span>
            </summary>
            <div className="px-5 pb-4 pt-0">
              <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
