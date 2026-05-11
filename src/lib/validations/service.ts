import { z } from 'zod';

export const partSchema = z.object({
  part_category: z.enum(['Engine', 'Battery', 'Brakes', 'Electrical', 'Body', 'Tyres', 'Transmission', 'Cooling', 'Suspension', 'Other']),
  part_name: z.string().min(1, "Part name is required"),
  action: z.enum(['replaced', 'repaired', 'inspected', 'adjusted']),
  quantity: z.number().int().positive().default(1),
  price: z.number().min(0).default(0),
  is_amc_benefit: z.boolean().default(false),
  notes: z.string().optional()
});

export const serviceRecordSchema = z.object({
  visit_date: z.string().min(1, "Visit date is required"),
  mileage_at_visit: z.number().int().positive().optional(),
  visit_type: z.enum(['routine', 'repair', 'inspection', 'warranty']),
  complaint: z.string().optional(),
  diagnosis: z.string().optional(),
  work_done: z.string().optional(),
  technician_name: z.string().optional(),
  next_service_km: z.number().int().positive().optional(),
  next_service_date: z.string().optional(),
  labor_cost: z.number().min(0).default(0),
  parts: z.array(partSchema).default([])
});

export const closeRecordSchema = z.object({
  work_done: z.string().min(1, "Work done is required before closing this job card")
});

export type PartInput = z.infer<typeof partSchema>;
export type ServiceRecordInput = z.infer<typeof serviceRecordSchema>;
