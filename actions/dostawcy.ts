'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createDostawcaSchema,
  updateDostawcaSchema,
  createCenaSchema,
  updateCenaSchema,
  type DostawcyFilters,
} from '@/lib/validations/dostawcy';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// --- Interfaces ---

export interface DostawcaWithCount {
  id: string;
  nazwa: string;
  kod: string | null;
  kontakt: string | null;
  aktywny: boolean;
  produktyCount: number;
}

export interface DostawcyResult {
  data: DostawcaWithCount[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface DostawcaBase {
  id: string;
  nazwa: string;
  kod: string | null;
  kontakt: string | null;
  aktywny: boolean;
}

export interface CennikEntry {
  id: string;
  produktId: string;
  produktSku: string;
  produktNazwa: string;
  produktJednostka: string;
  cenaNetto: number;
  aktywny: boolean;
}

export interface DostawcaPozycja {
  id: string;
  kod: string;
  nazwa: string;
}

// --- Pagination ---

const PAGE_SIZE = 15;

// --- READ: Lista dostawców (paginated) ---

export async function getDostawcy(filters: DostawcyFilters): Promise<DostawcyResult> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  // We need aggregation (produktyCount), so use raw SQL via rpc or a simpler approach
  // Since PostgREST doesn't support GROUP BY with count on joins easily,
  // we'll do two queries: one for the list, one for counts

  let query = supabase
    .from('dostawcy')
    .select('id, nazwa, kod, kontakt, aktywny', { count: 'exact' })
    .order('nazwa')
    .range(offset, offset + PAGE_SIZE - 1);

  if (!filters.showInactive) {
    query = query.eq('aktywny', true);
  }

  if (filters.search) {
    query = query.or(`nazwa.ilike.%${filters.search}%,kod.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Fetch product counts for these suppliers
  const ids = (data || []).map((d: { id: string }) => d.id);

  let countsMap: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: countData, error: countError } = await supabase
      .from('ceny_dostawcow')
      .select('dostawca_id')
      .in('dostawca_id', ids);

    if (!countError && countData) {
      countsMap = (countData as { dostawca_id: string }[]).reduce<Record<string, number>>((acc, row) => {
        acc[row.dostawca_id] = (acc[row.dostawca_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      nazwa: d.nazwa as string,
      kod: d.kod as string | null,
      kontakt: d.kontakt as string | null,
      aktywny: d.aktywny as boolean,
      produktyCount: countsMap[d.id as string] || 0,
    })),
    totalCount: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// --- READ: Single dostawca ---

export async function getDostawca(id: string): Promise<DostawcaBase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dostawcy')
    .select('id, nazwa, kod, kontakt, aktywny')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as DostawcaBase;
}

// --- READ: Dostawca cennik (price list) ---

export async function getDostawcaCennik(dostawcaId: string): Promise<CennikEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ceny_dostawcow')
    .select(`
      id,
      produkt_id,
      cena_netto,
      aktywny,
      produkty!produkt_id(sku, nazwa, jednostka)
    `)
    .eq('dostawca_id', dostawcaId)
    .order('cena_netto', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => {
    const produkt = row.produkty as { sku: string; nazwa: string; jednostka: string } | null;
    return {
      id: row.id as string,
      produktId: row.produkt_id as string,
      produktSku: produkt?.sku ?? '',
      produktNazwa: produkt?.nazwa ?? '',
      produktJednostka: produkt?.jednostka ?? 'szt',
      cenaNetto: Number(row.cena_netto),
      aktywny: row.aktywny as boolean,
    };
  });
}

// --- READ: Positions using this supplier ---

export async function getDostawcaPozycje(dostawcaId: string): Promise<DostawcaPozycja[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('biblioteka_skladowe_materialy')
    .select(`
      pozycje_biblioteka!pozycja_biblioteka_id(id, kod, nazwa)
    `)
    .eq('dostawca_id', dostawcaId);

  if (error) throw error;

  // Deduplicate by pozycja id
  const seen = new Set<string>();
  const result: DostawcaPozycja[] = [];
  for (const row of (data || []) as Record<string, unknown>[]) {
    const pozycja = row.pozycje_biblioteka as { id: string; kod: string; nazwa: string };
    if (!seen.has(pozycja.id)) {
      seen.add(pozycja.id);
      result.push({ id: pozycja.id, kod: pozycja.kod, nazwa: pozycja.nazwa });
    }
  }
  return result;
}

// --- CREATE dostawca ---

export async function createDostawca(input: unknown): Promise<ActionResult<DostawcaBase>> {
  const parsed = createDostawcaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dostawcy')
    .insert({
      nazwa: parsed.data.nazwa,
      kod: parsed.data.kod,
      kontakt: parsed.data.kontakt,
      aktywny: parsed.data.aktywny,
    })
    .select('id, nazwa, kod, kontakt, aktywny')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dostawcy');
  return { success: true, data: data as DostawcaBase };
}

// --- UPDATE dostawca ---

export async function updateDostawca(id: string, input: unknown): Promise<ActionResult<DostawcaBase>> {
  const parsed = updateDostawcaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.kod !== undefined) updateData.kod = parsed.data.kod;
  if (parsed.data.kontakt !== undefined) updateData.kontakt = parsed.data.kontakt;
  if (parsed.data.aktywny !== undefined) updateData.aktywny = parsed.data.aktywny;

  const { data, error } = await supabase
    .from('dostawcy')
    .update(updateData)
    .eq('id', id)
    .select('id, nazwa, kod, kontakt, aktywny')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dostawcy');
  return { success: true, data: data as DostawcaBase };
}

// --- DELETE dostawca ---

export async function deleteDostawca(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count: cenyCount } = await supabase
    .from('ceny_dostawcow')
    .select('*', { count: 'exact', head: true })
    .eq('dostawca_id', id);

  if (cenyCount && cenyCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - dostawca ma ${cenyCount} produktów w cenniku`,
    };
  }

  const { error } = await supabase
    .from('dostawcy')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dostawcy');
  return { success: true };
}

// --- CREATE cena ---

export async function createCena(input: unknown): Promise<ActionResult> {
  const parsed = createCenaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('ceny_dostawcow')
    .insert({
      dostawca_id: parsed.data.dostawcaId,
      produkt_id: parsed.data.produktId,
      cena_netto: parsed.data.cenaNetto,
      aktywny: parsed.data.aktywny,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ten produkt jest już w cenniku tego dostawcy' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/dostawcy');
  revalidatePath('/materialy');
  return { success: true };
}

// --- UPDATE cena ---

export async function updateCena(id: string, input: unknown): Promise<ActionResult> {
  const parsed = updateCenaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.cenaNetto !== undefined) updateData.cena_netto = parsed.data.cenaNetto;
  if (parsed.data.aktywny !== undefined) updateData.aktywny = parsed.data.aktywny;

  const { error } = await supabase
    .from('ceny_dostawcow')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dostawcy');
  revalidatePath('/materialy');
  return { success: true };
}

// --- DELETE cena ---

export async function deleteCena(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ceny_dostawcow')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dostawcy');
  revalidatePath('/materialy');
  return { success: true };
}
