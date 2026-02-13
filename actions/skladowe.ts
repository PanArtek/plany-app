'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createSkladowaMaterialSchema,
  createSkladowaRobociznaSchema,
  type CreateSkladowaMaterialInput,
  type CreateSkladowaRobociznaInput,
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

export interface SkladowaRobocizna {
  id: string;
  lp: number;
  opis: string;
  pozycja_biblioteka_id: string;
  cena: number;
  podwykonawca_id: string | null;
  created_at: string | null;
}

// ==================== ROBOCIZNA ====================

export async function createSkladowaRobocizna(
  pozycjaId: string,
  input: unknown
): Promise<ActionResult<SkladowaRobocizna>> {
  const parsed = createSkladowaRobociznaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Get next lp
  const { data: maxLpData } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('lp')
    .eq('pozycja_biblioteka_id', pozycjaId)
    .order('lp', { ascending: false })
    .limit(1)
    .single();

  const nextLp = (maxLpData?.lp ?? 0) + 1;

  const { data, error } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .insert({
      pozycja_biblioteka_id: pozycjaId,
      lp: nextLp,
      opis: parsed.data.opis,
      cena: parsed.data.cena,
      podwykonawca_id: parsed.data.podwykonawca_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update cached cena_robocizny on pozycja
  await recalcPozycjaCenaRobocizny(supabase, pozycjaId);

  revalidatePath('/pozycje');
  return { success: true, data: data as SkladowaRobocizna };
}

export async function updateSkladowaRobocizna(
  id: string,
  input: unknown
): Promise<ActionResult<SkladowaRobocizna>> {
  const parsed = createSkladowaRobociznaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .update({
      opis: parsed.data.opis,
      cena: parsed.data.cena,
      podwykonawca_id: parsed.data.podwykonawca_id ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update cached cena_robocizny on pozycja
  await recalcPozycjaCenaRobocizny(supabase, data.pozycja_biblioteka_id as string);

  revalidatePath('/pozycje');
  return { success: true, data: data as SkladowaRobocizna };
}

export async function deleteSkladowaRobocizna(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get pozycja_id before deleting
  const { data: skladowa } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('pozycja_biblioteka_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update cached cena_robocizny on pozycja
  if (skladowa) {
    await recalcPozycjaCenaRobocizny(supabase, skladowa.pozycja_biblioteka_id as string);
  }

  revalidatePath('/pozycje');
  return { success: true };
}

// Recalculate cached cena_robocizny = SUM(skladowe.cena)
async function recalcPozycjaCenaRobocizny(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pozycjaId: string
) {
  const { data: skladowe } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('cena')
    .eq('pozycja_biblioteka_id', pozycjaId);

  const sum = (skladowe || []).reduce((acc, s) => acc + Number(s.cena ?? 0), 0);

  await supabase
    .from('pozycje_biblioteka')
    .update({ cena_robocizny: sum })
    .eq('id', pozycjaId);
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
