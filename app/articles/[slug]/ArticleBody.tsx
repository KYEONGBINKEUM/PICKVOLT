'use client'

import { useEffect } from 'react'

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html
  try {
    const DOMPurify = require('dompurify')
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'small', 'ul', 'ol', 'li',
        'blockquote', 'code', 'pre', 'a', 'img', 'div', 'span', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel', 'id', 'width', 'height'],
      ALLOW_DATA_ATTR: false,
    })
  } catch {
    return html
  }
}

export default function ArticleBody({ slug, html }: { slug: string; html: string }) {
  useEffect(() => {
    fetch(`/api/articles/${slug}/view`, { method: 'POST' }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <div
      id="article-content"
      className="text-[15px] text-white/80 leading-[1.85] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:text-white/50 [&_blockquote]:italic [&_blockquote]:my-4 [&_img]:rounded-card [&_img]:my-4 [&_a]:text-accent [&_a]:hover:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}
