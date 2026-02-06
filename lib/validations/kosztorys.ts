import { z } from 'zod';

// Schema for updating kosztorys position fields (partial update)
export const updateKosztorysPozycjaSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(500, "Max 500 znaków").optional(),
  ilosc: z.number().positive("Ilość musi być większa od 0").optional(),
  jednostka: z.string().optional(),
  narzut_percent: z.number().min(0, "Min 0%").max(100, "Max 100%").optional(),
  notatki: z.string().optional(),
});

// Schema for updating labor component
export const updateSkladowaRSchema = z.object({
  stawka: z.number().min(0, "Stawka nie może być ujemna"),
  podwykonawca_id: z.string().uuid().nullable().optional(),
});

// Schema for updating material component
export const updateSkladowaMSchema = z.object({
  cena: z.number().min(0, "Cena nie może być ujemna"),
  dostawca_id: z.string().uuid().nullable().optional(),
});

// Schema for library position filters
export const libraryFiltersSchema = z.object({
  search: z.string().optional(),
  branza: z.string().optional(),
  kategoria: z.string().optional(),
  page: z.coerce.number().optional().default(1),
});

// TypeScript types
export type UpdateKosztorysPozycjaInput = z.infer<typeof updateKosztorysPozycjaSchema>;
export type UpdateSkladowaRInput = z.infer<typeof updateSkladowaRSchema>;
export type UpdateSkladowaMInput = z.infer<typeof updateSkladowaMSchema>;
export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;
