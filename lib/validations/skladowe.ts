import { z } from 'zod';

// Jednostki dla materiałów
const jednostkaMaterialValues = ['m²', 'mb', 'szt', 'l', 'kg', 'kpl'] as const;

// Schema dla tworzenia składowej materiałowej
export const createSkladowaMaterialSchema = z.object({
  nazwa: z.string()
    .min(1, "Nazwa jest wymagana")
    .max(255, "Max 255 znaków"),
  norma_domyslna: z.number()
    .positive("Norma musi być większa od 0"),
  jednostka: z.enum(jednostkaMaterialValues)
    .nullable()
    .optional(),
  cena_domyslna: z.number()
    .min(0, "Cena nie może być ujemna")
    .nullable()
    .optional(),
});

// Schema dla tworzenia składowej robociznowej (biblioteka)
export const createSkladowaRobociznaSchema = z.object({
  opis: z.string()
    .min(1, "Opis jest wymagany")
    .max(255, "Max 255 znaków"),
  cena: z.number()
    .min(0, "Cena nie może być ujemna"),
  podwykonawca_id: z.string().uuid().nullable().optional(),
});

// Typy TypeScript
export type CreateSkladowaMaterialInput = z.infer<typeof createSkladowaMaterialSchema>;
export type CreateSkladowaRobociznaInput = z.infer<typeof createSkladowaRobociznaSchema>;

// Export enums for use in UI
export const jednostkaMaterialOptions = jednostkaMaterialValues;
