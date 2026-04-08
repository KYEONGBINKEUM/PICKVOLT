import Navbar from '@/components/Navbar'
import ContactContent from './ContactContent'
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
        <ContactContent />
      </main>
    </>
  )
}
