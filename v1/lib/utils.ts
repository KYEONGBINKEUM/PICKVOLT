import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price)
}

/**
 * 긴 제품명에서 핵심 모델명만 추출
 * "Samsung Galaxy Book3 Pro Intel® Core™ i7 ..." → "Samsung Galaxy Book3 Pro"
 */
export function shortenProductName(name: string): string {
  const stopPattern = /\s+(?:Intel|AMD|Apple\s+[Mm]\d|Snapdragon|Qualcomm|MediaTek|Dimensity|SM-|NP\d|\d+\.\d+\s*(?:cm|inch|")|(?:\d+\s*GB)|(?:\d+\s*TB)|Wi-Fi|USB|SSD|HDD|eMMC|LPDDR|DDR|5G\b|4G\b|Dual\s+SIM)/i
  const match = name.match(stopPattern)
  if (match && match.index && match.index > 5) {
    return name.slice(0, match.index).trim()
  }
  return name.length > 40 ? name.slice(0, 37).trimEnd() + '...' : name
}

/**
 * "A vs B vs C" 형태의 비교 제목에서 각 제품명을 단축
 */
export function shortenCompareTitle(title: string | undefined | null): string {
  if (!title) return ''
  return title
    .split(' vs ')
    .map(shortenProductName)
    .join(' vs ')
}

/**
 * Supabase Storage URL을 리사이징된 URL로 변환
 * /storage/v1/object/public/ → /storage/v1/render/image/public/?width=W&quality=Q
 * 외부 URL이면 원본 반환
 */
export function imgUrl(url: string | null | undefined, width: number, quality = 80): string {
  if (!url) return ''
  if (!url.includes('/storage/v1/object/public/')) return url
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}&resize=contain`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
