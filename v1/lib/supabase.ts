import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface ComparisonHistory {
  id: string
  user_id: string
  title: string
  products: string[]
  result: {
    winner: string
    summary: string
    reasoning: string
    scores?: Record<string, { value: number; reason: string }>
  }
  pinned: boolean
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  budget: number
  photography: number
  performance: number
  battery: number
  updated_at: string
}

// Helper: save comparison to history
export async function saveComparison(
  userId: string,
  title: string,
  products: string[],
  result: ComparisonHistory['result']
) {
  const { data, error } = await supabase
    .from('comparison_history')
    .insert({
      user_id: userId,
      title,
      products,
      result,
      pinned: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: get user history
export async function getUserHistory(userId: string): Promise<ComparisonHistory[]> {
  const { data, error } = await supabase
    .from('comparison_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}

// Helper: toggle pin
export async function togglePin(id: string, pinned: boolean) {
  const { error } = await supabase
    .from('comparison_history')
    .update({ pinned })
    .eq('id', id)

  if (error) throw error
}

// Helper: delete comparison
export async function deleteComparison(id: string) {
  const { error } = await supabase
    .from('comparison_history')
    .delete()
    .eq('id', id)

  if (error) throw error
}
