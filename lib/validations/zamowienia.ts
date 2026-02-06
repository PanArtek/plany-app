import { z } from 'zod';

export const zamowienieEditSchema = z.object({
  data_zamowienia: z.string().optional(),
  data_dostawy_planowana: z.string().optional(),
  uwagi: z.string().optional(),
});

export const dostawaSchema = z.object({
  data_dostawy: z.string().min(1, 'Data dostawy jest wymagana'),
  numer_wz: z.string().optional(),
  uwagi: z.string().optional(),
  pozycje: z.array(z.object({
    zamowienie_pozycja_id: z.string().uuid(),
    ilosc: z.number().positive('Ilość musi być większa od 0'),
  })).min(1, 'Wymagana co najmniej jedna pozycja'),
});

export type ZamowienieEditInput = z.infer<typeof zamowienieEditSchema>;
export type DostawaInput = z.infer<typeof dostawaSchema>;
