import { z } from 'zod'

export const orderSchema = z.object({
  token: z.string(),
  name: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    menuId: z.string(),
    qty: z.number().min(1).max(20),
    notes: z.string().optional()
  }))
})
