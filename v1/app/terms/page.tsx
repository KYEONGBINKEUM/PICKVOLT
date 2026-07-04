import Navbar from '@/components/Navbar'
import TermsContent from './TermsContent'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <TermsContent />
      </main>
    </>
  )
}
