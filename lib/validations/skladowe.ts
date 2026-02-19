import { z } from 'zod';

// Jednostki dla materiałów
const jednostkaMaterialValues = ['m²', 'mb', 'szt', 'l', 'kg', 'kpl'] as const;

// Schema dla tworzenia/edycji składowej robocizny (new schema)
// Columns: typ_robocizny_id (NOT NULL), podwykonawca_id (NOT NULL), cena
export const createSkladowaRobociznaSchema = z.object({
  typ_robocizny_id: z.string().uuid("Typ robocizny jest wymagany"),
  podwykonawca_id: z.string().uuid("Podwykonawca jest wymagany"),
  cena: z.number()
    .min(0, "Cena nie może być ujemna")
    .optional()
    .default(0),
});

// Form schema for zodResolver (no .default())
export const skladowaRobociznaFormSchema = z.object({
  typ_robocizny_id: z.string().uuid("Typ robocizny jest wymagany"),
  podwykonawca_id: z.string().uuid("Podwykonawca jest wymagany"),
  cena: z.number().min(0, "Cena nie może być ujemna"),
});

// Schema dla tworzenia/edycji składowej materiałowej (new schema)
// Columns: produkt_id (NOT NULL), dostawca_id (NOT NULL), norma_domyslna, jednostka
export const createSkladowaMaterialSchema = z.object({
  produkt_id: z.string().uuid("Produkt jest wymagany"),
  dostawca_id: z.string().uuid("Dostawca jest wymagany"),
  norma_domyslna: z.number()
    .positive("Norma musi być większa od 0")
    .optional()
    .default(1),
  jednostka: z.enum(jednostkaMaterialValues)
    .nullable()
    .optional(),
});

// Form schema for zodResolver (no .default())
export const skladowaMaterialFormSchema = z.object({
  produkt_id: z.string().uuid("Produkt jest wymagany"),
  dostawca_id: z.string().uuid("Dostawca jest wymagany"),
  norma_domyslna: z.number().positive("Norma musi być większa od 0"),
  jednostka: z.enum(jednostkaMaterialValues).nullable(),
});

// Typy TypeScript
export type CreateSkladowaRobociznaInput = z.infer<typeof createSkladowaRobociznaSchema>;
export type CreateSkladowaMaterialInput = z.infer<typeof createSkladowaMaterialSchema>;
export type SkladowaRobociznaFormInput = z.infer<typeof skladowaRobociznaFormSchema>;
export type SkladowaMaterialFormInput = z.infer<typeof skladowaMaterialFormSchema>;

// Export enums for use in UI
export const jednostkaMaterialOptions = jednostkaMaterialValues;
