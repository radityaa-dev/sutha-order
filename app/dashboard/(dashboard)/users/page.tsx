'use client'

import { useEffect, useState } from 'react'
import { getUsers } from './actions'
import { CreateUserForm, ToggleActive } from '../../../../components/admin/user-form'
import { UserActions } from '../../../../components/admin/user-actions'
import { Badge } from '../../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { toast } from 'sonner'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  kasir: 'Kasir',
  dapur: 'Dapur',
  stakeholder: 'Stakeholder',
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = () => {
    getUsers()
      .then(setUsers)
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Akun Staf</h1>
        <CreateUserForm />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Aktif</TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabel[u.role] || u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <ToggleActive user={u} onSuccess={loadUsers} />
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions user={u} onSuccess={loadUsers} />
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
