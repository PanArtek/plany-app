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

// Schema dla tworzenia podwykonawcy
export const createPodwykonawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().default(true),
  ...companyCardFields,
});

// Schema dla edycji podwykonawcy (wszystkie pola opcjonalne)
export const updatePodwykonawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().optional(),
  ...companyCardFields,
});

// Schema dla tworzenia stawki
export const createStawkaSchema = z.object({
  podwykonawcaId: z.string().uuid("Nieprawidłowe ID podwykonawcy"),
  pozycjaBibliotekaId: z.string().uuid("Nieprawidłowe ID pozycji"),
  stawka: z.number().positive("Stawka musi być większa od 0"),
});

// Schema dla edycji stawki
export const updateStawkaSchema = z.object({
  stawka: z.number().positive("Stawka musi być większa od 0").optional(),
});

// Schema dla filtrów URL
export const podwykonawcyFiltersSchema = z.object({
  search: z.string().optional(),
  specjalizacja: z.string().optional(),
  showInactive: z.coerce.boolean().optional().default(false),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().optional().default(1),
});

// Form schemas (no .default() for zodResolver compatibility)
export const podwykonawcaFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional().or(z.literal('')),
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

export const stawkaFormSchema = z.object({
  pozycjaBibliotekaId: z.string().uuid("Wybierz pozycję"),
  stawka: z.number().positive("Stawka musi być większa od 0"),
});

// Typy TypeScript
export type CreatePodwykonawcaInput = z.infer<typeof createPodwykonawcaSchema>;
export type UpdatePodwykonawcaInput = z.infer<typeof updatePodwykonawcaSchema>;
export type CreateStawkaInput = z.infer<typeof createStawkaSchema>;
export type UpdateStawkaInput = z.infer<typeof updateStawkaSchema>;
export type PodwykonawcyFilters = z.infer<typeof podwykonawcyFiltersSchema>;
