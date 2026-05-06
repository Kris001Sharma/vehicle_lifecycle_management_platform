import { z } from 'zod';

export const inventoryUnitSchema = z.object({
  variant_id: z.string().uuid("Invalid variant ID"),
  chassis_number: z.string().optional(),
  colour: z.string().optional(),
  condition: z.enum(['new', 'demo', 'refurbished']),
  received_date: z.string().optional(),
  notes: z.string().optional()
});

export type InventoryUnitFormData = z.infer<typeof inventoryUnitSchema>;
