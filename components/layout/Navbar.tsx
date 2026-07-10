import Link from 'next/link'
import Image from 'next/image'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-color.svg"
            alt="PICKVOLT"
            width={120}
            height={26}
            priority
          />
        </Link>
        <div className="flex items-center gap-8 text-sm font-medium text-[#6A8AA8]">
          <Link href="/region/seoul" className="hover:text-[#1A2535] transition-colors duration-200">국내여행</Link>
          <Link href="/travel" className="hover:text-[#1A2535] transition-colors duration-200">전체글</Link>
          <Link href="/about" className="hover:text-[#1A2535] transition-colors duration-200">소개</Link>
        </div>
      </div>
    </nav>
  )
}
