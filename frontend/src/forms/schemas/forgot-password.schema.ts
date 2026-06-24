import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
