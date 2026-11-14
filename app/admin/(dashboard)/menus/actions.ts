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
  const is_available = formData.get('is_available') === 'true'
  const is_active = formData.get('is_active') !== 'false'
  const is_seasonal = formData.get('is_seasonal') === 'true'
  const seasonal_start = formData.get('seasonal_start') as string | null
  const seasonal_end = formData.get('seasonal_end') as string | null
  const image = formData.get('image') as File | null
  const modifierGroupIds = JSON.parse(formData.get('modifierGroupIds') as string || '[]')

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

  const { data: newMenu, error } = await adminClient.from('menus').insert({
    name,
    category_id,
    price,
    description,
    image_url,
    is_available,
    is_active,
    is_seasonal,
    seasonal_start,
    seasonal_end
  }).select().single()

  if (error) throw error

  if (modifierGroupIds.length > 0) {
    const records = modifierGroupIds.map((groupId: string, index: number) => ({
      menu_id: newMenu.id,
      group_id: groupId,
      sort_order: index,
    }))
    await adminClient.from('menu_modifier_groups').insert(records)
  }

  revalidatePath('/admin/menus')
  revalidatePath('/m/[token]', 'page')
}

export async function updateMenu(id: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const price = parseInt(formData.get('price') as string)
  const description = formData.get('description') as string
  const is_available = formData.get('is_available') === 'true'
  const is_active = formData.get('is_active') !== 'false'
  const is_seasonal = formData.get('is_seasonal') === 'true'
  const seasonal_start = formData.get('seasonal_start') as string | null
  const seasonal_end = formData.get('seasonal_end') as string | null
  const image = formData.get('image') as File | null
  const old_image_url = formData.get('old_image_url') as string | null
  const modifierGroupIds = JSON.parse(formData.get('modifierGroupIds') as string || '[]')

  let image_url = old_image_url

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

    if (old_image_url) {
      try {
        const oldFileName = old_image_url.split('/').pop()
        if (oldFileName) {
          await adminClient.storage.from('menu-images').remove([oldFileName])
        }
      } catch (err) {
        console.error('Gagal hapus gambar lama:', err)
      }
    }
  }

  const { error, count } = await adminClient
    .from('menus')
    .update({
      name,
      category_id,
      price,
      description,
      image_url,
      is_available,
      is_active,
      is_seasonal,
      seasonal_start,
      seasonal_end
    })
    .eq('id', id)
    .select()

  if (error) throw error
  if (!count || count === 0) throw new Error('Menu tidak ditemukan')

  // Update modifier groups
  await adminClient.from('menu_modifier_groups').delete().eq('menu_id', id)
  if (modifierGroupIds.length > 0) {
    const records = modifierGroupIds.map((groupId: string, index: number) => ({
      menu_id: id,
      group_id: groupId,
      sort_order: index,
    }))
    await adminClient.from('menu_modifier_groups').insert(records)
  }

  revalidatePath('/admin/menus')
  revalidatePath('/m/[token]', 'page')
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
