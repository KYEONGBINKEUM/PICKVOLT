import Link from 'next/link'
import Image from 'next/image'

const NAV_ITEMS = [
  { label: '장소 추천', href: '/travel' },
  { label: '호텔 추천', href: '/travel?category=hotel' },
  { label: '여행 소식', href: '/travel?category=news' },
  { label: '소개', href: '/about' },
  { label: '문의', href: '/contact' },
]

export default function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(251,251,250,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="max-w-5xl mx-auto px-6 flex items-center justify-between"
        style={{ height: '56px' }}
      >
        <Link href="/" aria-label="PICKVOLT 홈">
          <Image src="/logo-color.svg" alt="PICKVOLT" width={110} height={24} priority />
        </Link>

        <ul className="flex items-center gap-8 list-none p-0 m-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="nav-link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
