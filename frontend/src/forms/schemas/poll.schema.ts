import { z } from 'zod';

export const QuestionType = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT'] as const;
export const Visibility = ['PUBLIC', 'PRIVATE'] as const;

const optionSchema = z.object({
  text: z.string().min(1, 'Option text required').max(200, 'Option too long'),
});

const questionSchema = z
  .object({
    type: z.enum(QuestionType),
    text: z.string().min(1, 'Question text required').max(500, 'Question too long'),
    isRequired: z.boolean(),
    options: z.array(optionSchema).optional(),
  })
  .refine(
    (q) => q.type === 'TEXT' || (q.options && q.options.length >= 2),
    { message: 'At least 2 options required for choice questions', path: ['options'] },
  );

export const pollFormSchema = z.object({
  title: z.string().min(1, 'Title required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().or(z.literal('')),
  visibility: z.enum(Visibility),
  isActive: z.boolean(),
  expiresAt: z.string().optional().or(z.literal('')),
  questions: z.array(questionSchema).min(1, 'Add at least one question'),
});

export type PollFormValues = z.infer<typeof pollFormSchema>;
