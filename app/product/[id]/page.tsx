import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// TODO: 자체 DB 연동 예정
export default async function ProductPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">제품 상세 페이지는 준비 중입니다.</p>
          <Link href="/" className="text-accent text-sm hover:underline">
            <ArrowLeft className="inline w-3.5 h-3.5 mr-1" />
            back
          </Link>
        </div>
      </main>
    </>
  )
}
