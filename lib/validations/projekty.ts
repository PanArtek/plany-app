import { z } from 'zod';

// Schema dla tworzenia projektu
export const createProjektSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  klient: z.string().max(255, "Max 255 znaków").optional(),
  adres: z.string().optional(),
  powierzchnia: z.number().positive("Powierzchnia musi być większa od 0").optional(),
  notatki: z.string().optional(),
});

// Schema dla edycji projektu (wszystkie pola opcjonalne)
export const updateProjektSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków").optional(),
  klient: z.string().max(255, "Max 255 znaków").optional(),
  adres: z.string().optional(),
  powierzchnia: z.number().positive("Powierzchnia musi być większa od 0").optional(),
  status: z.enum(['draft', 'ofertowanie', 'realizacja', 'zamkniety', 'odrzucony']).optional(),
  notatki: z.string().optional(),
});

// Schema dla filtrów URL
export const projektyFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().optional().default(1),
});

// Typy TypeScript
export type CreateProjektInput = z.infer<typeof createProjektSchema>;
export type UpdateProjektInput = z.infer<typeof updateProjektSchema>;
export type ProjektyFilters = z.infer<typeof projektyFiltersSchema>;
