import Navbar from '@/components/Navbar'
import PrivacyContent from './PrivacyContent'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <PrivacyContent />
      </main>
    </>
  )
}
