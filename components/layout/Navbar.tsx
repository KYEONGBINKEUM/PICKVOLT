import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          PICKVOLT
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/region/seoul" className="hover:text-blue-600 transition">국내여행</Link>
          <Link href="/travel" className="hover:text-blue-600 transition">전체글</Link>
          <Link href="/about" className="hover:text-blue-600 transition">소개</Link>
        </div>
      </div>
    </nav>
  )
}
