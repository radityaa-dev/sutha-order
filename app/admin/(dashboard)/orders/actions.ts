'use server'

import { adminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(orderId: string, currentStatus: string, nextStatus: string) {
  await requireAdmin()

  // 1. Validasi Transisi
  const validTransitions: Record<string, string[]> = {
    paid: ['preparing', 'cancelled'],
    preparing: ['ready'],
    ready: ['completed'],
    completed: [],
    cancelled: []
  }

  if (!validTransitions[currentStatus]?.includes(nextStatus)) {
    throw new Error('Transisi status tidak valid')
  }

  // 2. Update Atomik
  const { data, error, count } = await adminClient
    .from('orders')
    .update({ order_status: nextStatus })
    .eq('id', orderId)
    .eq('order_status', currentStatus)
    .select()

  if (error) throw new Error('Kesalahan server: ' + error.message)
  if (count === 0) throw new Error('Status sudah diubah oleh pengguna lain')

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  return { success: true }
}
