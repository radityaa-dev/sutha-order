import { z } from 'zod'

export const orderSchema = z.object({
  token: z.string(),
  name: z.string().min(1),
  notes: z.string().max(200).optional(),
  serving_method: z.enum(['ambil_sendiri', 'antar_meja', 'antar_gedung']).optional().default('ambil_sendiri'),
  payment_mode: z.enum(['bayar_sekarang', 'open_bill']).optional().default('bayar_sekarang'),
  items: z.array(z.object({
    menuId: z.string().uuid(),
    qty: z.number().int().min(1).max(20),
    notes: z.string().max(200).optional(),
    optionIds: z.array(z.string().uuid()).optional()
  })).min(1).max(50)
})
