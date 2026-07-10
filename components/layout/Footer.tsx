import Link from 'next/link'

const FOOTER_LINKS = [
  { label: '장소 추천', href: '/travel' },
  { label: '호텔 추천', href: '/travel?category=hotel' },
  { label: '여행 소식', href: '/travel?category=news' },
  { label: '소개', href: '/about' },
  { label: '문의하기', href: '/contact' },
  { label: '개인정보처리방침', href: '/privacy' },
]

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <p className="text-[20px] font-bold text-[#1A2535] mb-2">PICKVOLT</p>
            <p className="text-[16px] text-[#A8BED4]">진짜 여행의 기준</p>
          </div>
          <nav aria-label="푸터 메뉴">
            <ul className="flex flex-wrap gap-x-8 gap-y-3 list-none">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[16px] text-[#6A8AA8] hover:text-[#1A2535] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="border-t border-gray-100 mt-10 pt-6">
          <p className="text-[14px] text-[#A8BED4]">
            &copy; 2026 PICKVOLT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
