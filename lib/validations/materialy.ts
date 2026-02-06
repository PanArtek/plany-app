import { z } from 'zod';

// Jednostki produktów
const jednostkaValues = ['m²', 'm', 'mb', 'szt', 'kpl', 'h', 'kg', 'm³', 'l', 'opak'] as const;

// Schema dla tworzenia produktu (server-side, with defaults for API calls)
export const createProduktSchema = z.object({
  sku: z.string().min(1, "SKU jest wymagane"),
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  jednostka: z.enum(jednostkaValues).default('szt'),
  aktywny: z.boolean().default(true),
});

// Form schema (all fields required, for react-hook-form zodResolver compatibility)
export const produktFormSchema = z.object({
  sku: z.string().min(1, "SKU jest wymagane"),
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  jednostka: z.enum(jednostkaValues),
  aktywny: z.boolean(),
});

// Schema dla edycji produktu (wszystkie pola opcjonalne)
export const updateProduktSchema = z.object({
  sku: z.string().min(1, "SKU jest wymagane").optional(),
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  jednostka: z.enum(jednostkaValues).optional(),
  aktywny: z.boolean().optional(),
});

// Schema dla filtrów URL
export const materialyFiltersSchema = z.object({
  branza: z.string().optional(),
  kategoria: z.string().optional(),
  podkategoria: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
});

// Typy TypeScript
export type CreateProduktInput = z.infer<typeof createProduktSchema>;
export type UpdateProduktInput = z.infer<typeof updateProduktSchema>;
export type MaterialyFilters = z.infer<typeof materialyFiltersSchema>;

// Export enums for use in UI
export const jednostkaOptions = jednostkaValues;
