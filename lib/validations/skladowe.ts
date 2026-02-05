import { z } from 'zod';

// Jednostki dla robocizny
const jednostkaRobociznaValues = ['h', 'szt', 'kpl'] as const;

// Jednostki dla materiałów
const jednostkaMaterialValues = ['m²', 'mb', 'szt', 'l', 'kg', 'kpl'] as const;

// Schema dla tworzenia składowej robocizny
export const createSkladowaRobociznaSchema = z.object({
  opis: z.string()
    .min(1, "Opis jest wymagany")
    .max(500, "Max 500 znaków"),
  norma_domyslna: z.number()
    .positive("Norma musi być większa od 0"),
  jednostka: z.enum(jednostkaRobociznaValues).default('h'),
  stawka_domyslna: z.number()
    .min(0, "Stawka nie może być ujemna")
    .nullable()
    .optional(),
});

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

// Typy TypeScript
export type CreateSkladowaRobociznaInput = z.infer<typeof createSkladowaRobociznaSchema>;
export type CreateSkladowaMaterialInput = z.infer<typeof createSkladowaMaterialSchema>;

// Export enums for use in UI
export const jednostkaRobociznaOptions = jednostkaRobociznaValues;
export const jednostkaMaterialOptions = jednostkaMaterialValues;
