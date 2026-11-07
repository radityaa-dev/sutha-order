'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/auth'

export async function getMenus() {
  await requireAdmin()
  const { data, error } = await adminClient
    .from('menus')
    .select('*, categories(id, name)')
    .order('name')

  if (error) throw error
  return data
}

export async function createMenu(formData: FormData) {
  await requireAdmin()

  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const price = parseInt(formData.get('price') as string)
  const description = formData.get('description') as string
  const image = formData.get('image') as File | null

  let image_url = null

  if (image && image.size > 0) {
    if (image.size > 2 * 1024 * 1024) {
      throw new Error('Ukuran gambar maksimal 2 MB')
    }

    const fileExt = image.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { error: uploadError } = await adminClient.storage
      .from('menu-images')
      .upload(fileName, image)

    if (uploadError) throw uploadError

    const { data: publicUrlData } = adminClient.storage
      .from('menu-images')
      .getPublicUrl(fileName)

    image_url = publicUrlData.publicUrl
  }

  const { error } = await adminClient.from('menus').insert({
    name,
    category_id,
    price,
    description,
    image_url,
    is_available: true,
  })

  if (error) throw error
  revalidatePath('/admin/menus')
}

export async function toggleMenuAvailability(id: string, is_available: boolean) {
  await requireAdmin()
  const { error } = await adminClient
    .from('menus')
    .update({ is_available })
    .eq('id', id)

  if (error) throw error
  revalidatePath('/admin/menus')
}

export async function deleteMenu(id: string) {
  await requireAdmin()
  const { error } = await adminClient.from('menus').delete().eq('id', id)

  if (error) throw error
  revalidatePath('/admin/menus')
}
