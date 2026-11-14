'use server'

import { adminClient } from '../../../../lib/supabase/admin'
import { requireRole } from '../../../../lib/auth'

async function requireShiftUser() {
  return requireRole('admin', 'kasir')
}

export async function getMyShift() {
  const user = await requireShiftUser()
  const { data, error } = await adminClient
    .from('shifts')
    .select('*')
    .eq('user_id', user.id)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function doOpenShift(openingCash: number) {
  const user = await requireShiftUser()
  const { data, error } = await adminClient.rpc('open_shift', {
    p_user_id: user.id,
    p_opening_cash: openingCash,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function doCloseShift(shiftId: string, countedCash: number) {
  await requireShiftUser()
  const { data, error } = await adminClient.rpc('close_shift', {
    p_shift_id: shiftId,
    p_counted_cash: countedCash,
  })
  if (error) throw new Error(error.message)
  return data
}
