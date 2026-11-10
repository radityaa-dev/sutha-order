'use client'

import { useEffect, useState } from 'react'
import { getModifierGroups, deleteModifierGroup } from './actions'
import { ModifierGroupForm } from '../../../../components/admin/modifier-form'
import { Button } from '../../../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../../components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

export default function ModifiersPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const data = await getModifierGroups()
      setGroups(data)
    } catch (err: any) {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Hapus grup ini?')) return
    try {
      await deleteModifierGroup(id)
      toast.success('Grup dihapus')
      loadData()
    } catch {
      toast.error('Gagal hapus')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Add-on (Modifiers)</h1>
        <ModifierGroupForm />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Grup</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Wajib</TableHead>
              <TableHead>Jumlah Opsi</TableHead>
              <TableHead>Dipakai Menu</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="capitalize">{g.selection_type}</TableCell>
                <TableCell>{g.is_required ? 'Ya' : 'Tidak'}</TableCell>
                <TableCell>{g.modifier_options.length}</TableCell>
                <TableCell>{g.menu_modifier_groups.length}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                    } />
                    <DropdownMenuContent align="end">
                      <ModifierGroupForm initialData={g} />
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(g.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
