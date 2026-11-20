import { adminClient } from './supabase/admin'

export async function getActiveShift(userId: string) {
  const { data, error } = await adminClient
    .from('shifts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    console.error('Error getting active shift:', error)
    return null
  }

  return data?.id
}