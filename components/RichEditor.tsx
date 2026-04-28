'use client'

import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react'
import { Bold, Italic, Quote, List, Link2, ImageIcon, Loader2, Package } from 'lucide-react'
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
    { icon: Bold,   title: 'B',  action: () => exec('bold') },
    { icon: Italic, title: 'I',  action: () => exec('italic') },
    { icon: List,   title: '•',  action: () => exec('insertUnorderedList') },
    { icon: Quote,  title: '"',  action: () => doInsertHtml('<blockquote style="border-left:2px solid rgba(255,255,255,0.2);padding-left:12px;color:rgba(255,255,255,0.45);margin:4px 0">Quote</blockquote><br />') },
    { icon: Link2,  title: '🔗', action: () => { const url = prompt(urlPrompt); if (url) exec('createLink', url) } },
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
