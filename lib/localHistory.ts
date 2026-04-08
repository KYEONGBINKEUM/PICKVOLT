import type { ComparisonHistory } from './supabase'

const KEY = 'pv_local_history'
const MAX_ITEMS = 50

export type LocalHistory = Omit<ComparisonHistory, 'user_id' | 'pinned'>

export function getLocalHistory(): LocalHistory[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalHistory(item: LocalHistory): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getLocalHistory()
    const updated = [item, ...existing].slice(0, MAX_ITEMS)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

export function deleteLocalHistory(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getLocalHistory()
    localStorage.setItem(KEY, JSON.stringify(existing.filter((h) => h.id !== id)))
  } catch {}
}
