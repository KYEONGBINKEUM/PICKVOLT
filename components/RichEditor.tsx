'use client'

import { useRef, useState } from 'react'
import { Bold, Italic, Quote, List, Link2, ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RichEditorProps {
  editorRef: React.MutableRefObject<HTMLDivElement | null>
  initialHtml?: string
  onChange: (html: string) => void
  token: string | null
  placeholder: string
  uploadSizeError: string
  uploadFailText: string
  urlPrompt: string
  minHeight?: number
}

export default function RichEditor({
  editorRef,
  initialHtml,
  onChange,
  token,
  placeholder,
  uploadSizeError,
  uploadFailText,
  urlPrompt,
  minHeight = 280,
}: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  const insertHtml = (html: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      const el = editorRef.current
      if (!el) return
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    document.execCommand('insertHTML', false, html)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    // HTML 붙여넣기 차단: plain text만 허용
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      document.execCommand('insertText', false, text)
      onChange(editorRef.current?.innerHTML ?? '')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    if (file.size > 10 * 1024 * 1024) { alert(uploadSizeError); return }
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('community-images').upload(path, file, { upsert: false })
      if (error) { alert(uploadFailText + error.message); return }
      const { data } = supabase.storage.from('community-images').getPublicUrl(path)
      insertHtml(`<img src="${data.publicUrl}" style="max-width:100%;border-radius:10px;margin:6px 0;display:block;border:1px solid rgba(255,255,255,0.08)" /><br />`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tools = [
    { icon: Bold,   title: 'B',  action: () => exec('bold') },
    { icon: Italic, title: 'I',  action: () => exec('italic') },
    { icon: List,   title: '•',  action: () => exec('insertUnorderedList') },
    { icon: Quote,  title: '"',  action: () => insertHtml('<blockquote style="border-left:2px solid rgba(255,255,255,0.2);padding-left:12px;color:rgba(255,255,255,0.45);margin:4px 0">Quote</blockquote><br />') },
    { icon: Link2,  title: '🔗', action: () => {
      const url = prompt(urlPrompt)
      if (url) exec('createLink', url)
    }},
  ]

  return (
    <div className="border border-border rounded-xl overflow-hidden focus-within:border-white/20 transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-black/20 border-b border-border">
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
      </div>
      <div
        ref={el => {
          editorRef.current = el
          if (el && initialHtml !== undefined && el.innerHTML !== initialHtml) {
            el.innerHTML = initialHtml
          }
        }}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="px-4 py-3 text-sm text-white/85 leading-relaxed outline-none bg-surface empty:before:content-[attr(data-placeholder)] empty:before:text-white/20"
        style={{ minHeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      />
    </div>
  )
}
