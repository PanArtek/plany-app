import { z } from 'zod';

// Schema dla tworzenia dostawcy
export const createDostawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  kod: z.string().max(50, "Max 50 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().default(true),
});

// Schema dla edycji dostawcy (wszystkie pola opcjonalne)
export const updateDostawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  kod: z.string().max(50, "Max 50 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().optional(),
});

// Schema dla tworzenia ceny dostawcy
export const createCenaSchema = z.object({
  dostawcaId: z.string().uuid("Nieprawidłowe ID dostawcy"),
  produktId: z.string().uuid("Nieprawidłowe ID produktu"),
  cenaNetto: z.number().positive("Cena musi być większa od 0"),
  aktywny: z.boolean().default(true),
});

// Schema dla edycji ceny dostawcy
export const updateCenaSchema = z.object({
  cenaNetto: z.number().positive("Cena musi być większa od 0").optional(),
  aktywny: z.boolean().optional(),
});

// Schema dla filtrów URL
export const dostawcyFiltersSchema = z.object({
  search: z.string().optional(),
  showInactive: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().optional().default(1),
});

// Typy TypeScript
export type CreateDostawcaInput = z.infer<typeof createDostawcaSchema>;
export type UpdateDostawcaInput = z.infer<typeof updateDostawcaSchema>;
export type CreateCenaInput = z.infer<typeof createCenaSchema>;
export type UpdateCenaInput = z.infer<typeof updateCenaSchema>;
export type DostawcyFilters = z.infer<typeof dostawcyFiltersSchema>;
