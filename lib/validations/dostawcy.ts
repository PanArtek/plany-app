import { z } from 'zod';

// Shared company card fields
const companyCardFields = {
  nazwa_pelna: z.string().max(500, "Max 500 znaków").optional(),
  nip: z.string().max(13, "Max 13 znaków").optional(),
  regon: z.string().max(14, "Max 14 znaków").optional(),
  krs: z.string().max(10, "Max 10 znaków").optional(),
  adres_siedziby: z.string().optional(),
  osoba_reprezentujaca: z.string().max(255, "Max 255 znaków").optional(),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal('')),
  strona_www: z.string().max(500, "Max 500 znaków").optional(),
  nr_konta: z.string().max(32, "Max 32 znaków").optional(),
  uwagi: z.string().optional(),
  ocena: z.number().int().min(1, "Min 1").max(5, "Max 5").optional().nullable(),
};

// Schema dla tworzenia dostawcy
export const createDostawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  kod: z.string().max(50, "Max 50 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().default(true),
  ...companyCardFields,
});

// Schema dla edycji dostawcy (wszystkie pola opcjonalne)
export const updateDostawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  kod: z.string().max(50, "Max 50 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().optional(),
  ...companyCardFields,
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
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().optional().default(1),
});

// Form schemas (no .default() for zodResolver compatibility)
export const dostawcaFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  kod: z.string().max(50, "Max 50 znaków").optional().or(z.literal('')),
  kontakt: z.string().optional().or(z.literal('')),
  aktywny: z.boolean(),
  nazwa_pelna: z.string().max(500, "Max 500 znaków").optional().or(z.literal('')),
  nip: z.string().max(13, "Max 13 znaków").optional().or(z.literal('')),
  regon: z.string().max(14, "Max 14 znaków").optional().or(z.literal('')),
  krs: z.string().max(10, "Max 10 znaków").optional().or(z.literal('')),
  adres_siedziby: z.string().optional().or(z.literal('')),
  osoba_reprezentujaca: z.string().max(255, "Max 255 znaków").optional().or(z.literal('')),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal('')),
  strona_www: z.string().max(500, "Max 500 znaków").optional().or(z.literal('')),
  nr_konta: z.string().max(32, "Max 32 znaków").optional().or(z.literal('')),
  uwagi: z.string().optional().or(z.literal('')),
  ocena: z.number().int().min(1, "Min 1").max(5, "Max 5").optional().nullable(),
});

// Typy TypeScript
export type CreateDostawcaInput = z.infer<typeof createDostawcaSchema>;
export type UpdateDostawcaInput = z.infer<typeof updateDostawcaSchema>;
export type CreateCenaInput = z.infer<typeof createCenaSchema>;
export type UpdateCenaInput = z.infer<typeof updateCenaSchema>;
export type DostawcyFilters = z.infer<typeof dostawcyFiltersSchema>;
