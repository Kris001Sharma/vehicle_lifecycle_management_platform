import * as z from 'zod';

export const vehicleSaleSchema = z.object({
  vehicle_number: z.string().min(1, 'Vehicle number is required').trim(),
  chassis_number: z.string().optional(),
  registration_plate: z.string().optional(),
  sale_date: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Sale date cannot be in the future'),
  sale_notes: z.string().optional(),
  variant_id: z.string().uuid('Valid variant ID is required'),
  customer_id: z.string().uuid('Valid customer ID is required'),
});

export const vehicleEditSchema = z.object({
  registration_plate: z.string().optional(),
  chassis_number: z.string().optional(),
  sale_notes: z.string().optional()
});
