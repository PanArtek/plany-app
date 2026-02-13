'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createSkladowaMaterialSchema,
  type CreateSkladowaMaterialInput,
} from '@/lib/validations/skladowe';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Types matching database schema
export interface SkladowaMaterial {
  id: string;
  lp: number;
  nazwa: string;
  pozycja_biblioteka_id: string;
  produkt_id: string | null;
  dostawca_id: string | null;
  cena_domyslna: number | null;
  norma_domyslna: number | null;
  jednostka: string | null;
  created_at: string | null;
}

// ==================== MATERIAŁY ====================

export async function createSkladowaMaterial(
  pozycjaId: string,
  input: unknown
): Promise<ActionResult<SkladowaMaterial>> {
  const parsed = createSkladowaMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Get next lp for this pozycja
  const { data: maxLpData } = await supabase
    .from('biblioteka_skladowe_materialy')
    .select('lp')
    .eq('pozycja_biblioteka_id', pozycjaId)
    .order('lp', { ascending: false })
    .limit(1)
    .single();

  const nextLp = (maxLpData?.lp ?? 0) + 1;

  const { data, error } = await supabase
    .from('biblioteka_skladowe_materialy')
    .insert({
      pozycja_biblioteka_id: pozycjaId,
      lp: nextLp,
      nazwa: parsed.data.nazwa,
      norma_domyslna: parsed.data.norma_domyslna,
      jednostka: parsed.data.jednostka ?? null,
      cena_domyslna: parsed.data.cena_domyslna ?? null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true, data: data as SkladowaMaterial };
}

export async function updateSkladowaMaterial(
  id: string,
  input: unknown
): Promise<ActionResult<SkladowaMaterial>> {
  const parsed = createSkladowaMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('biblioteka_skladowe_materialy')
    .update({
      nazwa: parsed.data.nazwa,
      norma_domyslna: parsed.data.norma_domyslna,
      jednostka: parsed.data.jednostka ?? null,
      cena_domyslna: parsed.data.cena_domyslna ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true, data: data as SkladowaMaterial };
}

export async function deleteSkladowaMaterial(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('biblioteka_skladowe_materialy')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true };
}
