import Navbar from '@/components/Navbar'
import CookiesContent from './CookiesContent'

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <CookiesContent />
      </main>
    </>
  )
}
