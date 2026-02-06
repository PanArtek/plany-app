import { z } from 'zod';

export const umowaEditSchema = z.object({
  data_podpisania: z.string().optional(),
  warunki_platnosci: z.string().optional(),
  uwagi: z.string().optional(),
});

export const wykonanieSchema = z.object({
  data_wpisu: z.string().min(1, 'Data wpisu jest wymagana'),
  ilosc_wykonana: z.number().positive('Ilość musi być większa od 0'),
  uwagi: z.string().optional(),
});

export type UmowaEditInput = z.infer<typeof umowaEditSchema>;
export type WykonanieInput = z.infer<typeof wykonanieSchema>;
