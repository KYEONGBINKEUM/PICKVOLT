import { SupabaseClient } from '@supabase/supabase-js'

export interface RateLimitResult {
  blocked: boolean
  errorCode?: string
}

/**
 * Check post rate limit for a user.
 * - Max `maxCount` posts within `windowMinutes`
 * - Duplicate title within `dupWindowMinutes` is blocked
 */
export async function checkPostRateLimit(
  db: SupabaseClient,
  userId: string,
  title: string,
  options = { maxCount: 5, windowMinutes: 10, dupWindowMinutes: 30 }
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - options.windowMinutes * 60 * 1000).toISOString()
  const dupWindowStart = new Date(Date.now() - options.dupWindowMinutes * 60 * 1000).toISOString()

  const [countRes, dupRes] = await Promise.all([
    // Recent post count
    db.from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart),
    // Duplicate title check
    db.from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .ilike('title', title.trim())
      .gte('created_at', dupWindowStart),
  ])

  if ((dupRes.count ?? 0) > 0) {
    return { blocked: true, errorCode: 'duplicate_post' }
  }

  if ((countRes.count ?? 0) >= options.maxCount) {
    return { blocked: true, errorCode: 'too_many_posts' }
  }

  return { blocked: false }
}

/**
 * Check comment rate limit for a user.
 * - Max `maxCount` comments within `windowMinutes`
 * - Duplicate body within `dupWindowSeconds` is blocked
 */
export async function checkCommentRateLimit(
  db: SupabaseClient,
  userId: string,
  body: string,
  options = { maxCount: 10, windowMinutes: 5, dupWindowSeconds: 120 }
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - options.windowMinutes * 60 * 1000).toISOString()
  const dupWindowStart = new Date(Date.now() - options.dupWindowSeconds * 1000).toISOString()

  const [countRes, dupRes] = await Promise.all([
    db.from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart),
    db.from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('body', body.trim())
      .gte('created_at', dupWindowStart),
  ])

  if ((dupRes.count ?? 0) > 0) {
    return { blocked: true, errorCode: 'duplicate_comment' }
  }

  if ((countRes.count ?? 0) >= options.maxCount) {
    return { blocked: true, errorCode: 'too_many_comments' }
  }

  return { blocked: false }
}
