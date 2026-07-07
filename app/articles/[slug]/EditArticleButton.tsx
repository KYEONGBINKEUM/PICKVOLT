'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export default function EditArticleButton({ slug }: { slug: string }) {
  const { t } = useI18n()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const email = (user?.email ?? '').toLowerCase()
      setIsAdmin(ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email))
    })
  }, [])

  if (!isAdmin) return null

  return (
    <Link
      href={`/articles/write?slug=${slug}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
        color: '#FF4D00', border: '1px solid rgba(255,77,0,0.4)', borderRadius: 6,
        padding: '4px 10px', marginBottom: 12, textDecoration: 'none',
      }}
    >
      {t('articleWrite.edit_this')}
    </Link>
  )
}
