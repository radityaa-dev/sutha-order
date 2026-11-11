'use client'

import { useEffect, useState } from 'react'
import { getModifierGroups } from './actions'
import { ModifierGroupForm } from '../../../../components/admin/modifier-form'
import { ModifierActions } from '../../../../components/admin/modifier-actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { toast } from 'sonner'

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Add-on (Modifiers)</h1>
        <ModifierGroupForm />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Grup</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Wajib</TableHead>
                <TableHead>Jumlah Opsi</TableHead>
                <TableHead>Dipakai Menu</TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
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
                    <ModifierActions group={g} onSuccess={loadData} />
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
