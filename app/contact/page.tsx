import Navbar from '@/components/Navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — pickvolt',
  description: 'Get in touch with the pickvolt team. We\'re happy to help with questions, feedback, or partnership inquiries.',
}

const contactSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact — Pickvolt',
  url: 'https://www.pickvolt.com/contact',
  description: 'Get in touch with the Pickvolt team.',
  publisher: {
    '@type': 'Organization',
    name: 'Pickvolt',
    url: 'https://www.pickvolt.com',
    email: 'vandalroof@gmail.com',
  },
}

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">contact</p>
          <h1 className="text-4xl font-black text-white mb-2">Get in touch</h1>
          <p className="text-sm text-white/40 mb-10">We read every message and typically respond within 1–2 business days.</p>

          <div className="space-y-6">
            {/* Email options */}
            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="mailto:vandalroof@gmail.com"
                className="group flex flex-col gap-1.5 rounded-xl border border-border p-5 hover:border-white/20 transition-colors"
              >
                <span className="text-xs text-white/30 uppercase tracking-widest">General</span>
                <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">vandalroof@gmail.com</span>
                <span className="text-xs text-white/40">Questions, feedback, or anything else</span>
              </a>

              <a
                href="mailto:privacy@pickvolt.com"
                className="group flex flex-col gap-1.5 rounded-xl border border-border p-5 hover:border-white/20 transition-colors"
              >
                <span className="text-xs text-white/30 uppercase tracking-widest">Privacy</span>
                <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">privacy@pickvolt.com</span>
                <span className="text-xs text-white/40">Data requests, privacy inquiries</span>
              </a>
            </div>

            {/* FAQ nudge */}
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h2 className="text-sm font-bold text-white">Before you write</h2>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <span className="text-white/70">Missing a product?</span>
                  {' '}Send the product name and official page URL to hello@pickvolt.com and we'll add it.
                </li>
                <li>
                  <span className="text-white/70">Wrong specs?</span>
                  {' '}Include the product name and the corrected value with a source link.
                </li>
                <li>
                  <span className="text-white/70">Billing issue?</span>
                  {' '}Include your account email and a brief description.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
