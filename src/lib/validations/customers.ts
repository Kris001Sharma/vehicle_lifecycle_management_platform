import * as z from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  email: z.string().email('Invalid email format').min(5, 'Email is too short').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  customer_type: z.enum(['individual', 'fleet_owner', 'school', 'transporter']),
  fleet_name: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.customer_type === 'fleet_owner' && (!data.fleet_name || data.fleet_name.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fleet name is required for fleet owners',
      path: ['fleet_name']
    });
  }
});
