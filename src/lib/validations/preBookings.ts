import { z } from 'zod';

export const preBookingSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  variant_id: z.string().uuid("Invalid variant ID"),
  inventory_unit_id: z.string().uuid("Invalid unit ID").optional().nullable(),
  booking_date: z.string().min(1, "Booking date is required"),
  expected_delivery_date: z.string().optional().nullable(),
  colour_preference: z.string().optional().nullable(),
  special_requirements: z.string().optional().nullable(),
  deposit_received: z.boolean().default(false),
  deposit_amount: z.number().positive("Deposit amount must be positive").optional().nullable(),
  finance_type: z.enum(['cash', 'bank_loan', 'in_house', 'leasing']).optional().nullable(),
  finance_company: z.string().optional().nullable(),
  loan_reference: z.string().optional().nullable(),
  monthly_instalment: z.number().positive("Monthly instalment must be positive").optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.expected_delivery_date) {
    if (new Date(data.expected_delivery_date) < new Date(data.booking_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected delivery date must be on or after booking date",
        path: ["expected_delivery_date"]
      });
    }
  }
  if (data.deposit_received && (data.deposit_amount === undefined || data.deposit_amount === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Deposit amount is required when deposit is received",
      path: ["deposit_amount"]
    });
  }
});

export type PreBookingFormData = z.infer<typeof preBookingSchema>;
