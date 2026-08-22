import { z } from 'zod';

export const RECOMMENDED_ACTIONS = [
  'SCHEDULE_RETRY',
  'SEND_NOTIFICATION',
  'GENERATE_RECOVERY_LINK',
  'ESCALATE_TO_MERCHANT',
  'STOP_WORKFLOW',
];

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];

export const AIDiagnosisSchema = z.object({
  classification: z.string().min(1, 'Classification string is required'),
  confidenceScore: z.number().min(0).max(1),
  recommendedAction: z.enum(RECOMMENDED_ACTIONS),
  suggestedDelayMinutes: z.number().nonnegative().default(360),
  suggestedChannel: z.enum(NOTIFICATION_CHANNELS).nullable().optional().default(null),
  rationale: z.array(z.string()).min(1, 'At least one rationale bullet point is required'),
});

// Validates raw JSON object against AIDiagnosisSchema. Throws ZodError if invalid.
export const validateAIDiagnosis = (rawJson) => {
  return AIDiagnosisSchema.parse(rawJson);
};
