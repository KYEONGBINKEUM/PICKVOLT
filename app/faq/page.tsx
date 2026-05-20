'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n } from '@/lib/i18n'

const BASE_URL = 'https://www.pickvolt.com'

// FAQPage Schema (영어 고정 — Google 크롤러용)
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'How is the overall score calculated?', acceptedAnswer: { '@type': 'Answer', text: 'Each product is scored based on CPU/SoC performance (55%), camera (20%), battery (13%), and RAM (12%) for smartphones. Tablets emphasize CPU performance at 65%. Laptops with a discrete GPU split weight between CPU and GPU.' } },
    { '@type': 'Question', name: 'How many products can I compare at once?', acceptedAnswer: { '@type': 'Answer', text: 'You can add up to 4 products to the compare tray at the same time.' } },
    { '@type': 'Question', name: 'Are the prices shown real-time?', acceptedAnswer: { '@type': 'Answer', text: 'Prices are updated regularly but may not reflect real-time fluctuations. We recommend checking the retailer link for the most current price.' } },
    { '@type': 'Question', name: 'Can anyone write a review?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — any registered user can leave a star rating and written review. Sign in with your Google account to get started.' } },
    { '@type': 'Question', name: 'What product categories does Pickvolt cover?', acceptedAnswer: { '@type': 'Answer', text: 'Pickvolt currently covers smartphones, laptops, and tablets. More categories are planned.' } },
    { '@type': 'Question', name: 'I found incorrect product information. How do I report it?', acceptedAnswer: { '@type': 'Answer', text: 'On any product detail page, click the "Report issue" button to submit a correction.' } },
    { '@type': 'Question', name: 'Is Pickvolt free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, Pickvolt is completely free with no subscription required.' } },
  ],
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-sm font-semibold text-white group-hover:text-accent transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm text-white/50 leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  )
}

export default function FAQPage() {
  const { t } = useI18n()

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
    { q: t('faq.q7'), a: t('faq.a7') },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-3">{t('faq.title')}</h1>
          <p className="text-sm text-white/40">{t('faq.subtitle')}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl px-6">
          {faqs.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </main>
    </>
  )
}
