'use client'

import { useState, useEffect } from 'react'
import { getMenus, toggleMenuAvailability } from './actions'
import { getCategories } from '../categories/actions'
import { getModifierGroups } from '../modifiers/actions'
import { formatRupiah } from '../../../../lib/format'
import { MenuForm } from '../../../../components/admin/menu-form'
import { Button } from '../../../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Switch } from '../../../../components/ui/switch'
import { MenuActions } from '../../../../components/admin/menu-actions'
import { toast } from 'sonner'

export default function MenusPage() {
  const [menus, setMenus] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [modifierGroups, setModifierGroups] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const [menusData, categoriesData, modifiersData] = await Promise.all([
        getMenus(),
        getCategories(),
        getModifierGroups(),
      ])
      setMenus(menusData)
      setCategories(categoriesData)
      setModifierGroups(modifiersData)
    } catch (error) {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleMenuAvailability(id, !current)
      setMenus(menus.map(m => m.id === id ? { ...m, is_available: !current } : m))
      toast.success('Status diupdate')
    } catch {
      toast.error('Gagal update')
    }
  }

  const filteredMenus = selectedCategory
    ? menus.filter(m => m.category_id === selectedCategory)
    : menus

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Menu</h1>
        <MenuForm categories={categories} modifierGroups={modifierGroups} onSuccess={loadData} />
      </div>

      <div className="flex gap-2">
        <Button
          variant={selectedCategory === '' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('')}
          size="sm"
        >
          Semua
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat.id)}
            size="sm"
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Gambar</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead className="w-20 text-center">Tersedia</TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMenus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell>
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{menu.name}</TableCell>
                  <TableCell>{menu.categories?.name}</TableCell>
                  <TableCell>{formatRupiah(menu.price)}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={menu.is_available}
                      onCheckedChange={() => handleToggle(menu.id, menu.is_available)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <MenuActions 
                        menu={menu}
                        categories={categories}
                        modifierGroups={modifierGroups}
                        onSuccess={loadData}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
