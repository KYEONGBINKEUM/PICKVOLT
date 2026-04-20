'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, Check, Plus, Share2, Download, Code2, Copy, FileDown, ChevronDown, Loader2, Heart, Pencil } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useCompareCart } from '@/lib/compareCart'
import ReviewSection from '@/components/ReviewSection'
import { supabase } from '@/lib/supabase'

interface Specs {
  cpu:             string | null
  gpuName:         string | null
  ram:             string | null
  storage:         string | null
  display:         string | null
  camera:          string | null
  batteryCapacity: string | null
  batteryLife:     string | null
  os:              string | null
  wifi:            string | null
  bluetooth:       string | null
  weight:          string | null
}

interface ProductVariant {
  id:           string
  variant_name: string
  cpu_name:     string | null
  gpu_name:     string | null
  ram_gb:       string | null
  storage_gb:   string | null
  price_usd:    number | null
  amazon_url:   string | null
}

interface Product {
  id:         string
  name:       string
  brand:      string
  category:   string
  price_usd:  number | null
  image_url:  string | null
  amazon_url: string | null
  specs:      Specs
  variants?:  ProductVariant[]
}

function fmtGB(val: string): string {
  return String(val).split(',').map((s) => {
    const n = parseFloat(s.trim())
    if (isNaN(n)) return s.trim()
    return n >= 1024 ? `${n / 1024}TB` : `${n}GB`
  }).join(' / ')
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-border last:border-0">
      <span className="text-xs text-white/30 uppercase tracking-widest w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white/80 leading-relaxed">{value ?? '–'}</span>
    </div>
  )
}

export default function ProductClient({ product }: { product: Product }) {
  const { t } = useI18n()
  const { cart, add, remove } = useCompareCart()
  const inCart   = cart.some((i) => i.id === product.id)
  const cartFull = cart.length >= 4

  // variant 선택 상태 (null = 기본 모델)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId) ?? null

  // 선택된 variant 기준으로 표시할 스펙 계산
  const effectiveSpecs: Specs = selectedVariant ? {
    ...product.specs,
    ...(selectedVariant.cpu_name     && { cpu:     selectedVariant.cpu_name }),
    ...(selectedVariant.gpu_name     && { gpuName: selectedVariant.gpu_name }),
    ...(selectedVariant.ram_gb       && { ram:     fmtGB(selectedVariant.ram_gb) }),
    ...(selectedVariant.storage_gb   && { storage: fmtGB(selectedVariant.storage_gb) }),
  } : product.specs
  const effectivePrice = selectedVariant?.price_usd ?? product.price_usd

  const [shareCopied, setShareCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; sub: string } | null>(null)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setAuthToken(session.access_token)
      const email = (session.user?.email ?? '').toLowerCase()
      if (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email)) setIsAdmin(true)
      // 현재 제품 찜 여부 확인
      fetch(`/api/wishlist`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((json) => {
          const list = json.wishlist ?? []
          setWishlisted(list.some((w: { product_id: string }) => w.product_id === product.id))
        })
    })
  }, [product.id])

  const handleWishlist = async () => {
    if (!authToken) { window.location.href = '/login'; return }
    setWishlistLoading(true)
    try {
      if (wishlisted) {
        await fetch(`/api/wishlist?product_id=${product.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        })
        setWishlisted(false)
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ product_id: product.id }),
        })
        setWishlisted(true)
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const showToast = (msg: string, sub: string) => {
    setToast({ msg, sub })
    setTimeout(() => setToast(null), 2500)
  }

  const toggleCart = () => {
    if (inCart) remove(product.id)
    else if (!cartFull) add({ id: product.id, name: product.name, brand: product.brand, category: product.category })
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  const captureCanvas = async () => {
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('product-detail')
    if (!el) throw new Error('element not found')
    return html2canvas(el, {
      backgroundColor: '#0d0d0d',
      scale: 2,
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el.getAttribute('data-export-exclude') === 'true',
    })
  }

  const handleExportHTML = async () => {
    const specRows = [
      { label: t('product.spec_cpu'),     value: product.specs.cpu },
      { label: t('product.spec_ram'),     value: product.specs.ram },
      { label: t('product.spec_storage'), value: product.specs.storage },
      { label: t('product.spec_display'), value: product.specs.display },
      { label: t('product.spec_battery'), value: product.specs.batteryCapacity },
      { label: t('product.spec_camera'),  value: product.specs.camera },
      { label: t('product.spec_os'),      value: product.specs.os },
      { label: t('product.spec_weight'),  value: product.specs.weight },
    ].filter((r) => r.value)

    const rowsHTML = specRows.map((r) =>
      `<tr>
        <td style="padding:10px 14px;color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #2a2a2a;white-space:nowrap;">${r.label}</td>
        <td style="padding:10px 14px;color:#fff;font-size:13px;border-bottom:1px solid #2a2a2a;">${r.value}</td>
      </tr>`
    ).join('')

    const imgHTML = product.image_url
      ? `<img src="${product.image_url}" alt="${product.name}" style="width:180px;height:180px;object-fit:contain;display:block;margin-bottom:16px;">`
      : ''
    const priceHTML = product.price_usd
      ? `<p style="font-size:22px;font-weight:900;color:#FF6B2B;margin:0 0 20px;">From $${Number(product.price_usd).toLocaleString()}</p>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${product.name} — PICKVOLT</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;}</style>
</head>
<body>
${imgHTML}
<p style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">${product.brand} · ${product.category}</p>
<h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:12px;">${product.name}</h1>
${priceHTML}
<table style="border-collapse:collapse;width:100%;background:#161616;border-radius:12px;overflow:hidden;">
  <tbody>${rowsHTML}</tbody>
</table>
<p style="margin-top:16px;font-size:10px;color:#444;">pickvolt.com · ${new Date().toLocaleDateString()}</p>
</body>
</html>`

    await navigator.clipboard.writeText(html)
    showToast(t('export.toast_html'), t('export.toast_paste'))
  }

  const handleExportImage = async () => {
    const canvas = await captureCanvas()
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        showToast(t('export.toast_image'), t('export.toast_paste'))
      } catch {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `pickvolt-${product.name.replace(/\s+/g, '-')}.png`
        a.click(); URL.revokeObjectURL(url)
        showToast('이미지가 다운로드되었습니다', '클립보드 접근이 차단되어 파일로 저장했습니다')
      }
    })
  }

  const handleExportPDF = async () => {
    const canvas = await captureCanvas()
    const { default: jsPDF } = await import('jspdf')
    const imgData = canvas.toDataURL('image/png')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height / canvas.width) * pageW
    if (imgH <= pageH) {
      doc.addImage(imgData, 'PNG', 0, 0, imgW, imgH)
    } else {
      const scale = pageW / (canvas.width / 2)
      const pxPerPage = pageH / scale
      let srcY = 0
      while (srcY < canvas.height / 2) {
        if (srcY > 0) doc.addPage()
        const sliceH = Math.min(pxPerPage, canvas.height / 2 - srcY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceH * 2
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, srcY * 2, canvas.width, sliceH * 2, 0, 0, canvas.width, sliceH * 2)
        doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceH * scale)
        srcY += sliceH
      }
    }
    doc.save(`pickvolt-${product.name.replace(/\s+/g, '-')}.pdf`)
  }

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setExporting(key)
    setExportOpen(false)
    try { await fn() } finally { setExporting(null) }
  }

  const categoryLabel: Record<string, string> = {
    laptop: 'Laptop', smartphone: 'Smartphone', tablet: 'Tablet',
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white text-black rounded-2xl px-8 py-5 shadow-2xl text-center">
            <p className="font-bold text-base">✓ {toast.msg}</p>
            <p className="text-sm text-black/50 mt-1">{toast.sub}</p>
          </div>
        </div>
      )}

      {/* Back + export/share row */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('product.back')}
        </Link>
        <div className="flex items-center gap-2">
          {/* 내보내기 dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-semibold border border-border hover:border-white/20 px-3 py-1.5 rounded-full transition-all"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t('export.label')}
              <ChevronDown className="w-3 h-3" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 bg-surface-2 border border-border rounded-xl overflow-hidden shadow-xl min-w-[180px] z-20">
                  <button
                    onClick={() => wrap('html', handleExportHTML)}
                    disabled={!!exporting}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <Code2 className="w-4 h-4 flex-shrink-0" />
                    {t('export.html')}
                  </button>
                  <button
                    onClick={() => wrap('image', handleExportImage)}
                    disabled={!!exporting}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left border-t border-border"
                  >
                    <Copy className="w-4 h-4 flex-shrink-0" />
                    {t('export.image')}
                  </button>
                  <button
                    onClick={() => wrap('pdf', handleExportPDF)}
                    disabled={!!exporting}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left border-t border-border"
                  >
                    <FileDown className="w-4 h-4 flex-shrink-0" />
                    {t('export.pdf')}
                  </button>
                </div>
              </>
            )}
          </div>
          {/* 공유 */}
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-semibold border border-border hover:border-white/20 px-3 py-1.5 rounded-full transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareCopied ? 'Copied!' : t('compare.share')}
          </button>
          {/* 찜 */}
          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            title={wishlisted ? t('wishlist.remove') : t('wishlist.add')}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-full transition-all disabled:opacity-50 ${
              wishlisted
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'border-border text-white/40 hover:text-white/70 hover:border-white/20'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-red-400' : ''}`} />
            {wishlisted ? t('wishlist.saved') : t('wishlist.unsaved')}
          </button>
          {/* 관리자 수정 */}
          {isAdmin && (
            <Link
              href={`/admin/products/${product.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-full transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              수정
            </Link>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div id="product-detail" className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

        {/* LEFT — image + header info (sticky on desktop) */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-28">

          {/* Image */}
          <div className="relative aspect-square w-full bg-surface border border-border rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain p-8"
                sizes="(max-width: 1024px) 100vw, 384px"
                unoptimized
              />
            ) : (
              <span className="text-6xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
            )}
          </div>

          {/* Brand · Category */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/40 uppercase tracking-widest">{product.brand}</span>
            <span className="text-white/20">·</span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              {categoryLabel[product.category] ?? product.category}
            </span>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-black text-white leading-tight mb-4">
            {product.name}
          </h1>

          {/* Price */}
          {effectivePrice && (
            <p className="text-2xl font-black text-accent mb-5">
              From ${Number(effectivePrice).toLocaleString()}
            </p>
          )}

          {/* Actions — 내보내기시 제외 */}
          <div className="flex flex-col gap-2" data-export-exclude="true">
            <button
              onClick={toggleCart}
              disabled={!inCart && cartFull}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                inCart
                  ? 'bg-accent/15 border border-accent/40 text-accent'
                  : cartFull
                  ? 'bg-surface border border-border text-white/20 cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent-light'
              }`}
            >
              {inCart
                ? <><Check className="w-4 h-4" />{t('product.in_compare')}</>
                : <><Plus className="w-4 h-4" />{t('product.add_compare')}</>
              }
            </button>

            {(selectedVariant?.amazon_url ?? product.amazon_url) && (
              <a
                href={selectedVariant?.amazon_url ?? product.amazon_url ?? ''}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:brightness-105 active:scale-95 select-none"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/amazon-logo.svg" alt="Amazon" width={72} height={22} style={{ display: 'block' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.02em' }}>{t('compare.buy_now')}</span>
              </a>
            )}
          </div>
        </div>

        {/* RIGHT — benchmark + specs */}
        <div className="flex-1 min-w-0">
          {/* Variant selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">{t('compare.select_model')}</p>
              <select
                value={selectedVariantId ?? ''}
                onChange={(e) => setSelectedVariantId(e.target.value || null)}
                className="w-full rounded-lg px-3 py-2 text-xs font-semibold border border-accent/50 bg-surface-2 text-accent outline-none cursor-pointer"
              >
                <option value="">
                  {[product.specs.cpu, product.specs.gpuName].filter(Boolean).join(' + ') || product.name}
                </option>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.variant_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="bg-surface border border-border rounded-2xl px-6 py-2">
            <SpecRow label={t('product.spec_cpu')}     value={effectiveSpecs.cpu} />
            {product.category === 'laptop' && (
              <SpecRow label="GPU" value={effectiveSpecs.gpuName} />
            )}
            <SpecRow label={t('product.spec_ram')}     value={effectiveSpecs.ram} />
            <SpecRow label={t('product.spec_storage')} value={effectiveSpecs.storage} />
            <SpecRow label={t('product.spec_display')} value={effectiveSpecs.display} />
            <SpecRow label={t('product.spec_battery')} value={effectiveSpecs.batteryCapacity} />
            <SpecRow label={t('product.spec_camera')}  value={effectiveSpecs.camera} />
            <SpecRow label={t('product.spec_os')}        value={effectiveSpecs.os} />
            <SpecRow label={t('product.spec_wifi')}      value={effectiveSpecs.wifi} />
            <SpecRow label={t('product.spec_bluetooth')} value={effectiveSpecs.bluetooth} />
            <SpecRow label={t('product.spec_weight')}    value={effectiveSpecs.weight} />
          </div>
          <ReviewSection productId={product.id} />
        </div>
      </div>
    </>
  )
}
