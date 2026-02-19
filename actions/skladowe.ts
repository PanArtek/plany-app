'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createSkladowaRobociznaSchema,
  createSkladowaMaterialSchema,
} from '@/lib/validations/skladowe';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Types matching new database schema
export interface SkladowaRobocizna {
  id: string;
  lp: number;
  pozycja_biblioteka_id: string;
  typ_robocizny_id: string;
  podwykonawca_id: string;
  cena: number;
  created_at: string | null;
  // Joined data (populated when reading)
  typ_robocizny?: { id: string; nazwa: string; jednostka: string | null } | null;
  podwykonawca?: { id: string; nazwa: string } | null;
  stawka_cennik?: number | null; // from stawki_podwykonawcow
}

export interface SkladowaMaterial {
  id: string;
  lp: number;
  pozycja_biblioteka_id: string;
  produkt_id: string;
  dostawca_id: string;
  norma_domyslna: number | null;
  jednostka: string | null;
  created_at: string | null;
  // Joined data (populated when reading)
  produkt?: { id: string; nazwa: string; sku: string; jednostka: string } | null;
  dostawca?: { id: string; nazwa: string; kod: string | null } | null;
  cena_cennik?: number | null; // from ceny_dostawcow
}

// ==================== CENNIK LOOKUPS ====================

/** Look up the price from ceny_dostawcow for a given produkt + dostawca */
export async function getCenaCennik(
  produktId: string,
  dostawcaId: string
): Promise<{ cena_netto: number } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ceny_dostawcow')
    .select('cena_netto')
    .eq('produkt_id', produktId)
    .eq('dostawca_id', dostawcaId)
    .eq('aktywny', true)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data ? { cena_netto: Number(data.cena_netto) } : null;
}

/** Look up the stawka from stawki_podwykonawcow for a given typ_robocizny + podwykonawca */
export async function getStawkaCennik(
  typRobociznyId: string,
  podwykonawcaId: string
): Promise<{ stawka: number } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stawki_podwykonawcow')
    .select('stawka')
    .eq('typ_robocizny_id', typRobociznyId)
    .eq('podwykonawca_id', podwykonawcaId)
    .eq('aktywny', true)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data ? { stawka: Number(data.stawka) } : null;
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

  // Get next lp for this pozycja
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
      typ_robocizny_id: parsed.data.typ_robocizny_id,
      podwykonawca_id: parsed.data.podwykonawca_id,
      cena: parsed.data.cena ?? 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

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
      typ_robocizny_id: parsed.data.typ_robocizny_id,
      podwykonawca_id: parsed.data.podwykonawca_id,
      cena: parsed.data.cena ?? 0,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true, data: data as SkladowaRobocizna };
}

export async function deleteSkladowaRobocizna(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true };
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
      produkt_id: parsed.data.produkt_id,
      dostawca_id: parsed.data.dostawca_id,
      norma_domyslna: parsed.data.norma_domyslna ?? 1,
      jednostka: parsed.data.jednostka ?? null,
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
      produkt_id: parsed.data.produkt_id,
      dostawca_id: parsed.data.dostawca_id,
      norma_domyslna: parsed.data.norma_domyslna ?? 1,
      jednostka: parsed.data.jednostka ?? null,
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
