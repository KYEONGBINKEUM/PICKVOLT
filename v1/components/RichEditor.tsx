'use client'

import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react'
import { Bold, Italic, Quote, List, Link2, ImageIcon, Loader2, Package, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export interface RichEditorHandle {
  insertHtml: (html: string) => void
}

interface Props {
  editorRef: React.MutableRefObject<HTMLDivElement | null>
  onChange: (html: string) => void
  token: string | null
  placeholder: string
  uploadSizeError: string
  uploadFailText: string
  urlPrompt: string
  onOpenProductPanel?: () => void
  embedCount?: number
  maxEmbed?: number
  initialHtml?: string
  minHeight?: string
}

const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  {
    editorRef, onChange, token, placeholder,
    uploadSizeError, uploadFailText, urlPrompt,
    onOpenProductPanel, embedCount = 0, maxEmbed = 4,
    initialHtml, minHeight = '280px',
  },
  ref
) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const dragCardRef = useRef<HTMLElement | null>(null)

  const doInsertHtml = (html: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      const el = editorRef.current
      if (!el) return
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    document.execCommand('insertHTML', false, html)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  useImperativeHandle(ref, () => ({ insertHtml: doInsertHtml }))

  // Populate editor with initial content on mount only
  useEffect(() => {
    if (initialHtml !== undefined && editorRef.current) {
      editorRef.current.innerHTML = initialHtml
      onChange(initialHtml)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  // 외부 붙여넣기 HTML sanitizer — 화이트리스트 기반
  const sanitizePaste = (html: string): string => {
    if (typeof window === 'undefined') return ''
    const doc = new DOMParser().parseFromString(html, 'text/html')

    // 위험 태그 전체 제거
    const dangerousTags = ['script', 'style', 'iframe', 'frame', 'frameset',
      'object', 'embed', 'applet', 'form', 'input', 'textarea', 'button',
      'select', 'meta', 'link', 'base', 'noscript', 'template', 'svg', 'math']
    dangerousTags.forEach(tag =>
      doc.querySelectorAll(tag).forEach(el => el.remove())
    )

    // 허용 태그 외 나머지는 텍스트 노드로 치환
    const ALLOWED_TAGS = new Set([
      'p', 'br', 'div', 'span',
      'b', 'strong', 'i', 'em', 'u', 's',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'h1', 'h2', 'h3', 'h4',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
    ])

    // 모든 요소 순회하며 속성 sanitize
    const SAFE_STYLE_PROPS = new Set(['text-align', 'font-weight', 'font-style', 'text-decoration'])

    doc.body.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase()

      // 허용되지 않은 태그 → 내용만 유지 (unwrap)
      if (!ALLOWED_TAGS.has(tag)) {
        const frag = doc.createDocumentFragment()
        while (el.firstChild) frag.appendChild(el.firstChild)
        el.replaceWith(frag)
        return
      }

      // 속성 sanitize
      const toRemove: string[] = []
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase()

        // on* 이벤트 핸들러 전부 제거
        if (name.startsWith('on')) { toRemove.push(attr.name); continue }

        // href: http/https/상대경로만 허용
        if (name === 'href') {
          const v = attr.value.trim().toLowerCase()
          if (!v.startsWith('http://') && !v.startsWith('https://') && !v.startsWith('/')) {
            toRemove.push(attr.name)
          }
          continue
        }

        // src: img만 허용, https만 허용 (data:/javascript: 차단)
        if (name === 'src') {
          if (tag !== 'img') { toRemove.push(attr.name); continue }
          const v = attr.value.trim().toLowerCase()
          if (!v.startsWith('https://') && !v.startsWith('http://') && !v.startsWith('/')) {
            toRemove.push(attr.name)
          }
          continue
        }

        // style: 안전한 속성만
        if (name === 'style') {
          const safe = attr.value.split(';')
            .map(s => s.trim())
            .filter(s => {
              const prop = s.split(':')[0]?.trim().toLowerCase() ?? ''
              return SAFE_STYLE_PROPS.has(prop)
            })
            .join('; ')
          if (safe) el.setAttribute('style', safe)
          else toRemove.push(attr.name)
          continue
        }

        // alt, title 허용; 나머지 제거
        if (name !== 'alt' && name !== 'title') {
          toRemove.push(attr.name)
        }
      }
      toRemove.forEach(a => el.removeAttribute(a))
    })

    return doc.body.innerHTML
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    if (html) {
      const safe = sanitizePaste(html)
      document.execCommand('insertHTML', false, safe)
    } else {
      // plain text 폴백
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    if (file.size > 10 * 1024 * 1024) { alert(uploadSizeError); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('community-images').upload(path, file, { upsert: false })
      if (error) { alert(uploadFailText + error.message); return }
      const { data } = supabase.storage.from('community-images').getPublicUrl(path)
      doInsertHtml(`<img src="${data.publicUrl}" style="max-width:100%;border-radius:10px;margin:6px 0;display:block;border:1px solid rgba(255,255,255,0.08)" /><br />`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tools = [
    { icon: Bold,        title: 'B',  action: () => exec('bold') },
    { icon: Italic,      title: 'I',  action: () => exec('italic') },
    { icon: List,        title: '•',  action: () => exec('insertUnorderedList') },
    { icon: Quote,       title: '"',  action: () => doInsertHtml('<blockquote style="border-left:2px solid rgba(255,255,255,0.2);padding-left:12px;color:rgba(255,255,255,0.45);margin:4px 0">Quote</blockquote><br />') },
    { icon: Link2,       title: '🔗', action: () => { const url = prompt(urlPrompt); if (url) exec('createLink', url) } },
  ]

  // justifyCenter etc. sets text-align on block containers, but display:block images
  // ignore text-align — so we additionally apply margin-based centering to any images
  // inside the selection's common ancestor.
  const applyAlignment = (cmd: string, align: 'left' | 'center' | 'right') => {
    document.execCommand(cmd, false)
    editorRef.current?.focus()

    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0)
      const ancestor = range.commonAncestorContainer
      const el = ancestor.nodeType === Node.TEXT_NODE
        ? ancestor.parentElement
        : ancestor as HTMLElement

      const imgs: HTMLImageElement[] = el
        ? el.tagName === 'IMG'
          ? [el as HTMLImageElement]
          : Array.from(el.querySelectorAll<HTMLImageElement>('img'))
        : []

      if (imgs.length > 0) {
        imgs.forEach(img => {
          img.style.display = 'block'
          img.style.marginLeft  = align === 'left'   ? '0'    : 'auto'
          img.style.marginRight = align === 'right'  ? '0'    : 'auto'
        })
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const alignTools = [
    { icon: AlignLeft,   title: 'left',   action: () => applyAlignment('justifyLeft',   'left') },
    { icon: AlignCenter, title: 'center', action: () => applyAlignment('justifyCenter', 'center') },
    { icon: AlignRight,  title: 'right',  action: () => applyAlignment('justifyRight',  'right') },
  ]

  return (
    <div className="border border-border rounded-xl overflow-hidden focus-within:border-white/20 transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-black/20 border-b border-border flex-wrap">
        {tools.map(({ icon: Icon, title, action }) => (
          <button key={title} type="button" onMouseDown={e => { e.preventDefault(); action() }}
            className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors">
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-1" />
        {alignTools.map(({ icon: Icon, title, action }) => (
          <button key={title} type="button" onMouseDown={e => { e.preventDefault(); action() }}
            className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors">
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button"
          onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click() }}
          disabled={uploading}
          className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {onOpenProductPanel && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); if (embedCount < maxEmbed) onOpenProductPanel() }}
              disabled={embedCount >= maxEmbed}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-white/35 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{embedCount}/{maxEmbed}</span>
            </button>
          </>
        )}
      </div>

      <div
        ref={el => { editorRef.current = el }}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="px-4 py-3 text-sm text-white/85 leading-relaxed outline-none bg-surface empty:before:content-[attr(data-placeholder)] empty:before:text-white/20"
        style={{ minHeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        onClick={e => {
          const target = e.target as HTMLElement
          // X 버튼 클릭 → 제품 카드 삭제
          if (target.closest('[data-delete-card]')) {
            e.preventDefault()
            const card = target.closest('[data-product-card]') as HTMLElement | null
            if (card) {
              // br 다음 노드도 같이 제거
              const next = card.nextSibling
              card.remove()
              if (next?.nodeName === 'BR') next.parentNode?.removeChild(next)
              onChange(editorRef.current?.innerHTML ?? '')
            }
            return
          }
          // 제품 카드 링크 클릭 → 에디터 내 네비게이션 차단
          if (target.closest('[data-product-card]')) {
            e.preventDefault()
          }
        }}
        onDragStart={e => {
          const target = e.target as HTMLElement
          const card = target.closest('[data-product-card]') as HTMLElement | null
          if (card) {
            dragCardRef.current = card
            card.style.opacity = '0.4'
          }
        }}
        onDragEnd={() => {
          if (dragCardRef.current) {
            dragCardRef.current.style.opacity = '1'
            dragCardRef.current = null
            onChange(editorRef.current?.innerHTML ?? '')
          }
        }}
        onDragOver={e => {
          const dragging = dragCardRef.current
          if (!dragging) return
          e.preventDefault()
          // 드래그 위치 기준으로 가장 가까운 카드 찾기
          const cards = Array.from(editorRef.current?.querySelectorAll('[data-product-card]') ?? []) as HTMLElement[]
          const after = cards.find(card => {
            if (card === dragging) return false
            const box = card.getBoundingClientRect()
            return e.clientY < box.top + box.height / 2
          })
          if (after) {
            editorRef.current?.insertBefore(dragging, after)
          } else {
            editorRef.current?.appendChild(dragging)
          }
        }}
      />
    </div>
  )
})

export default RichEditor
