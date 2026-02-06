import { z } from 'zod';

// Schema dla tworzenia podwykonawcy
export const createPodwykonawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().default(true),
});

// Schema dla edycji podwykonawcy (wszystkie pola opcjonalne)
export const updatePodwykonawcaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional(),
  kontakt: z.string().optional(),
  aktywny: z.boolean().optional(),
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
  showInactive: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().optional().default(1),
});

// Form schemas (no .default() for zodResolver compatibility)
export const podwykonawcaFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional().or(z.literal('')),
  kontakt: z.string().optional().or(z.literal('')),
  aktywny: z.boolean(),
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
