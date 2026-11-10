import { z } from 'zod'

export const orderSchema = z.object({
  token: z.string(),
  name: z.string().min(1),
  notes: z.string().max(200).optional(),
  items: z.array(z.object({
    menuId: z.string().uuid(),
    qty: z.number().int().min(1).max(20),
    notes: z.string().max(200).optional(),
    optionIds: z.array(z.string().uuid()).optional()
  })).min(1).max(50)
})
