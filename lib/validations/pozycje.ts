import { z } from 'zod';

// Jednostki pozycji
const jednostkaValues = ['m²', 'm', 'mb', 'szt', 'kpl', 'h', 'kg', 'm³'] as const;

// Typy pozycji (z enum position_type w bazie)
const typValues = ['robocizna', 'material', 'komplet'] as const;

// Schema dla tworzenia pozycji
// Kod is auto-generated from server, just validate it's non-empty
export const createPozycjaSchema = z.object({
  kod: z.string().min(1, "Kod jest wymagany"),
  nazwa: z.string()
    .min(3, "Min 3 znaki")
    .max(500, "Max 500 znaków"),
  jednostka: z.enum(jednostkaValues, "Wybierz jednostkę"),
  typ: z.enum(typValues, "Wybierz typ pozycji"),
  kategoriaId: z.string().uuid("Wybierz podkategorię"),
  opis: z.string().max(2000, "Max 2000 znaków").optional(),
});

// Schema dla edycji pozycji (wszystkie pola opcjonalne)
export const updatePozycjaSchema = z.object({
  kod: z.string().min(1, "Kod jest wymagany").optional(),
  nazwa: z.string()
    .min(3, "Min 3 znaki")
    .max(500, "Max 500 znaków")
    .optional(),
  jednostka: z.enum(jednostkaValues).optional(),
  typ: z.enum(typValues).optional(),
  kategoriaId: z.string().uuid().nullable().optional(),
  opis: z.string().max(2000, "Max 2000 znaków").optional(),
});

// Schema dla filtrów URL
export const pozycjeFiltersSchema = z.object({
  branza: z.string().optional(),
  kategoria: z.string().optional(),
  podkategoria: z.string().optional(),
  search: z.string().optional(),
  selected: z.string().uuid().optional(),
  page: z.coerce.number().optional().default(1),
});

// Typy TypeScript
export type CreatePozycjaInput = z.infer<typeof createPozycjaSchema>;
export type UpdatePozycjaInput = z.infer<typeof updatePozycjaSchema>;
export type PozycjeFilters = z.infer<typeof pozycjeFiltersSchema>;

// Export enums for use in UI
export const jednostkaOptions = jednostkaValues;
export const typOptions = typValues;
