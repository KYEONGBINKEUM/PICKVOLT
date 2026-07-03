import Link from 'next/link'
import { Plus } from 'lucide-react'

interface ComparisonPillProps {
  label: string
  href: string
}

export default function ComparisonPill({ label, href }: ComparisonPillProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-2 border border-border text-sm text-white/70 hover:text-white hover:border-white/20 transition-all duration-200 group"
    >
      <Plus className="w-3.5 h-3.5 text-accent group-hover:rotate-90 transition-transform duration-200" />
      {label}
    </Link>
  )
}
