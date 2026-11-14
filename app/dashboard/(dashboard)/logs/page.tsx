'use client'

import { useState, useEffect } from 'react'
import { getAuditLogs, getVoidLogs } from '../reports/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { formatRupiah } from '../../../../lib/format'
import { format } from 'date-fns'

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [voids, setVoids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAuditLogs(), getVoidLogs()])
      .then(([l, v]) => { setLogs(l); setVoids(v); })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Audit & Log Void</h1>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Aktivitas Sistem</TabsTrigger>
          <TabsTrigger value="void">Log Void Order</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{log.user_profiles?.full_name || 'System'}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs font-mono">{JSON.stringify(log.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="void" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Kode Order</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead>Penyetuju</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voids.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(v.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{v.orders?.order_code}</TableCell>
                    <TableCell>{v.requester?.full_name || '-'}</TableCell>
                    <TableCell>{v.approver?.full_name || '-'}</TableCell>
                    <TableCell>{v.reason}</TableCell>
                    <TableCell><Badge variant="destructive">{v.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}