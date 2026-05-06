import { z } from 'zod';

export const communicationSchema = z.object({
  log_type: z.enum(['activity', 'followup']),
  interaction_type: z.enum(['phone_call', 'whatsapp', 'email', 'site_visit', 'in_person', 'other']),
  direction: z.enum(['inbound', 'outbound']).optional(),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
  outcome: z.enum(['follow_up_scheduled', 'quotation_sent', 'awaiting_decision', 'booking_confirmed', 'no_further_action', 'other']).optional(),
  follow_up_date: z.string().optional().nullable(),
  pre_booking_id: z.string().uuid("Invalid booking ID").optional().nullable()
}).superRefine((data, ctx) => {
  if (data.log_type === 'followup') {
    if (!data.follow_up_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required",
        path: ["follow_up_date"]
      });
    } else {
      const today = new Date();
      today.setHours(0,0,0,0);
      const followUpDate = new Date(data.follow_up_date);
      if (followUpDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Follow-up date must be today or in the future",
          path: ["follow_up_date"]
        });
      }
    }
  }
});

export type CommunicationFormData = z.infer<typeof communicationSchema>;
