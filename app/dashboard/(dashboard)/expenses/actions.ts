'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { requireFeature } from '@/lib/auth'

// Pengeluaran: admin=full, stakeholder=view.
async function requireExpenseUser() {
  return requireFeature('finance', 'view')
}

async function requireExpenseWrite() {
  return requireFeature('finance', 'full')
}

export async function getExpenses() {
  await requireExpenseUser()
  const { data, error } = await adminClient
    .from('expenses')
    .select(`
      *,
      user_profiles (full_name)
    `)
    .order('expense_date', { ascending: false })

  if (error) throw error
  return data
}

export async function createExpense(input: { expense_date: string; category: string; amount: number; description?: string }) {
  // Hanya admin yang bisa input pengeluaran
  const user = await requireExpenseWrite()

  const { error } = await adminClient.from('expenses').insert({
    expense_date: input.expense_date,
    category: input.category,
    amount: input.amount,
    description: input.description,
    recorded_by: user.id,
  })

  if (error) throw error
  revalidatePath('/dashboard/expenses')
}

export async function updateExpense(id: string, input: { expense_date?: string; category?: string; amount?: number; description?: string }) {
  await requireExpenseWrite()

  const { error } = await adminClient
    .from('expenses')
    .update(input)
    .eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/expenses')
}

export async function deleteExpense(id: string) {
  await requireExpenseWrite()

  const { error } = await adminClient.from('expenses').delete().eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/expenses')
}
