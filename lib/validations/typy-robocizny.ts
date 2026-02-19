import { z } from 'zod';

const jednostkaValues = ['m2', 'mb', 'szt', 'kpl', 'h'] as const;

// Server-side schema (with defaults)
export const createTypRobociznySchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  jednostka: z.enum(jednostkaValues).default('m2'),
  opis: z.string().max(500, "Max 500 znaków").optional().nullable(),
  aktywny: z.boolean().default(true),
});

// Form schema (for react-hook-form zodResolver — no .default())
export const typRobociznyFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  jednostka: z.enum(jednostkaValues),
  opis: z.string().max(500, "Max 500 znaków").optional().nullable(),
  aktywny: z.boolean(),
});

// Update schema (all fields optional)
export const updateTypRobociznySchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  jednostka: z.enum(jednostkaValues).optional(),
  opis: z.string().max(500, "Max 500 znaków").optional().nullable(),
  aktywny: z.boolean().optional(),
});

// Search/filter schema
export const typyRobociznyFiltersSchema = z.object({
  search: z.string().optional(),
  showInactive: z.coerce.boolean().optional().default(false),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().optional().default(1),
});

// TypeScript types
export type CreateTypRobociznyInput = z.infer<typeof createTypRobociznySchema>;
export type UpdateTypRobociznyInput = z.infer<typeof updateTypRobociznySchema>;
export type TypyRobociznyFilters = z.infer<typeof typyRobociznyFiltersSchema>;

export const jednostkaOptions = jednostkaValues;
