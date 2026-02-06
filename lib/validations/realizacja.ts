import { z } from 'zod';

export const wpisCreateSchema = z.object({
  typ: z.enum(['material', 'robocizna', 'inny']),
  kwota_netto: z.number().positive('Kwota musi być większa od 0'),
  numer_faktury: z.string().max(100).optional().nullable(),
  data_faktury: z.string().optional().nullable(),
  opis: z.string().max(500).optional().nullable(),
  zamowienie_id: z.string().uuid().optional().nullable(),
  umowa_id: z.string().uuid().optional().nullable(),
  oplacone: z.boolean().default(false),
});

// Separate form schema without .default() for zodResolver compatibility
export const wpisFormSchema = z.object({
  typ: z.enum(['material', 'robocizna', 'inny']),
  kwota_netto: z.number().positive('Kwota musi być większa od 0'),
  numer_faktury: z.string().max(100).optional().nullable(),
  data_faktury: z.string().optional().nullable(),
  opis: z.string().max(500).optional().nullable(),
  zamowienie_id: z.string().uuid().optional().nullable(),
  umowa_id: z.string().uuid().optional().nullable(),
  oplacone: z.boolean(),
}).refine(
  (data) => !(data.zamowienie_id && data.umowa_id),
  { message: 'Wpis może być powiązany z zamówieniem lub umową, nie oboma' }
);

export const wpisEditSchema = wpisCreateSchema;

export type WpisCreateInput = z.infer<typeof wpisCreateSchema>;
export type WpisEditInput = z.infer<typeof wpisEditSchema>;
export type WpisFormInput = z.infer<typeof wpisFormSchema>;
