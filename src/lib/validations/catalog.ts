import * as z from 'zod';

export const vehicleTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const vehicleModelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category_id: z.string().uuid('Valid category is required'),
  type_id: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
});

export const variantSpecsElectricSchema = z.object({
  motor_kw: z.number().positive(),
  battery_kwh: z.number().positive(),
  range_km: z.number().positive(),
  charge_time_ac_hrs: z.number().positive().optional(),
  charge_time_dc_mins: z.number().positive().optional(),
  max_payload_kg: z.number().positive().optional(),
  seating_capacity: z.number().int().positive(),
  gvw_kg: z.number().positive().optional(),
  wheelbase_mm: z.number().positive().optional(),
});

export const variantSpecsDieselSchema = z.object({
  engine_cc: z.number().positive(),
  horsepower: z.number().positive(),
  torque_nm: z.number().positive().optional(),
  fuel_tank_litres: z.number().positive(),
  max_payload_kg: z.number().positive().optional(),
  gvw_kg: z.number().positive().optional(),
  seating_capacity: z.number().int().positive(),
  wheelbase_mm: z.number().positive().optional(),
  emission_standard: z.string().optional(),
});

const baseVariantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  status: z.enum(['active', 'discontinued', 'draft']).default('active'),
  service_interval_km: z.number().positive().optional(),
  service_interval_months: z.number().positive().optional(),
  warranty_vehicle_yrs: z.number().positive().optional(),
  warranty_battery_yrs: z.number().positive().optional(),
  warranty_motor_yrs: z.number().positive().optional(),
  launched_at: z.string().optional(),
});

export const variantSchema = z.discriminatedUnion('vehicle_type_slug', [
  baseVariantSchema.extend({
    vehicle_type_slug: z.literal('electric'),
    specs: variantSpecsElectricSchema,
  }),
  baseVariantSchema.extend({
    vehicle_type_slug: z.literal('diesel'),
    specs: variantSpecsDieselSchema,
  })
]);

export const featureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  vehicle_type_id: z.string().uuid('Valid type is required').optional().nullable(),
  is_default_standard: z.boolean().default(false),
});
