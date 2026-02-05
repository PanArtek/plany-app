import { z } from 'zod';

// Schema dla tworzenia kategorii (dynamiczna walidacja kodu po parentId)
export const createKategoriaSchema = z.object({
  parentId: z.string().uuid().nullable(),
  kod: z.string().min(2, "Kod jest wymagany"),
  nazwa: z.string().min(3, "Min 3 znaki").max(255, "Max 255 znaków"),
}).refine(
  data => {
    if (data.parentId === null) {
      // Branża: 2-3 wielkie litery
      return /^[A-Z]{2,3}$/.test(data.kod);
    } else {
      // Kategoria/Podkategoria: 2 cyfry
      return /^\d{2}$/.test(data.kod);
    }
  },
  {
    message: "Nieprawidłowy format kodu (branża: 2-3 wielkie litery, kategoria/podkategoria: 2 cyfry)",
    path: ["kod"]
  }
);

// Schema dla edycji kategorii
export const updateKategoriaSchema = z.object({
  kod: z.string().min(2).optional(),
  nazwa: z.string().min(3, "Min 3 znaki").max(255, "Max 255 znaków").optional(),
}).refine(
  data => data.kod !== undefined || data.nazwa !== undefined,
  { message: "Podaj kod lub nazwę do zmiany" }
);

// Typy TypeScript
export type CreateKategoriaInput = z.infer<typeof createKategoriaSchema>;
export type UpdateKategoriaInput = z.infer<typeof updateKategoriaSchema>;
