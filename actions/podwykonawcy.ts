'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createPodwykonawcaSchema,
  updatePodwykonawcaSchema,
  createStawkaSchema,
  updateStawkaSchema,
  type PodwykonawcyFilters,
} from '@/lib/validations/podwykonawcy';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// --- Interfaces ---

export interface PodwykonawcaWithCount {
  id: string;
  nazwa: string;
  specjalizacja: string | null;
  kontakt: string | null;
  aktywny: boolean;
  stawkiCount: number;
}

export interface PodwykonawcyResult {
  data: PodwykonawcaWithCount[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PodwykonawcaBase {
  id: string;
  nazwa: string;
  specjalizacja: string | null;
  kontakt: string | null;
  aktywny: boolean;
}

export interface StawkaEntry {
  id: string;
  pozycjaBibliotekaId: string;
  pozycjaKod: string;
  pozycjaNazwa: string;
  pozycjaJednostka: string;
  stawka: number;
  aktywny: boolean;
}

export interface PodwykonawcaPozycja {
  id: string;
  kod: string;
  nazwa: string;
}

// --- Pagination ---

const PAGE_SIZE = 15;

// --- READ: Lista podwykonawców (paginated) ---

export async function getPodwykonawcy(filters: PodwykonawcyFilters): Promise<PodwykonawcyResult> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('podwykonawcy')
    .select('id, nazwa, specjalizacja, kontakt, aktywny', { count: 'exact' })
    .order('nazwa')
    .range(offset, offset + PAGE_SIZE - 1);

  if (!filters.showInactive) {
    query = query.eq('aktywny', true);
  }

  if (filters.search) {
    query = query.or(`nazwa.ilike.%${filters.search}%,specjalizacja.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Fetch stawki counts for these subcontractors
  const ids = (data || []).map((d: { id: string }) => d.id);

  let countsMap: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: countData, error: countError } = await supabase
      .from('stawki_podwykonawcow')
      .select('podwykonawca_id')
      .in('podwykonawca_id', ids);

    if (!countError && countData) {
      countsMap = (countData as { podwykonawca_id: string }[]).reduce<Record<string, number>>((acc, row) => {
        acc[row.podwykonawca_id] = (acc[row.podwykonawca_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      nazwa: d.nazwa as string,
      specjalizacja: d.specjalizacja as string | null,
      kontakt: d.kontakt as string | null,
      aktywny: d.aktywny as boolean,
      stawkiCount: countsMap[d.id as string] || 0,
    })),
    totalCount: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// --- READ: Single podwykonawca ---

export async function getPodwykonawca(id: string): Promise<PodwykonawcaBase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('podwykonawcy')
    .select('id, nazwa, specjalizacja, kontakt, aktywny')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PodwykonawcaBase;
}

// --- READ: Podwykonawca stawki (rate list) ---

export async function getPodwykonawcaStawki(podwykonawcaId: string): Promise<StawkaEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stawki_podwykonawcow')
    .select(`
      id,
      pozycja_biblioteka_id,
      stawka,
      aktywny,
      pozycje_biblioteka!pozycja_biblioteka_id(kod, nazwa, jednostka)
    `)
    .eq('podwykonawca_id', podwykonawcaId);

  if (error) throw error;

  // Sort by pozycja kod
  const mapped = (data || []).map((row: Record<string, unknown>) => {
    const pozycja = row.pozycje_biblioteka as { kod: string; nazwa: string; jednostka: string } | null;
    return {
      id: row.id as string,
      pozycjaBibliotekaId: row.pozycja_biblioteka_id as string,
      pozycjaKod: pozycja?.kod ?? '',
      pozycjaNazwa: pozycja?.nazwa ?? '',
      pozycjaJednostka: pozycja?.jednostka ?? 'm²',
      stawka: Number(row.stawka),
      aktywny: row.aktywny as boolean,
    };
  });

  mapped.sort((a, b) => a.pozycjaKod.localeCompare(b.pozycjaKod));
  return mapped;
}

// --- READ: Positions using this subcontractor ---

export async function getPodwykonawcaPozycje(podwykonawcaId: string): Promise<PodwykonawcaPozycja[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select(`
      pozycje_biblioteka!pozycja_biblioteka_id(id, kod, nazwa)
    `)
    .eq('podwykonawca_id', podwykonawcaId);

  if (error) throw error;

  // Deduplicate by pozycja id
  const seen = new Set<string>();
  const result: PodwykonawcaPozycja[] = [];
  for (const row of (data || []) as Record<string, unknown>[]) {
    const pozycja = row.pozycje_biblioteka as { id: string; kod: string; nazwa: string };
    if (!seen.has(pozycja.id)) {
      seen.add(pozycja.id);
      result.push({ id: pozycja.id, kod: pozycja.kod, nazwa: pozycja.nazwa });
    }
  }
  return result;
}

// --- READ: All pozycje_biblioteka (for stawka form select dropdown) ---

export async function getAllPozycjeBiblioteka(): Promise<{ id: string; kod: string; nazwa: string; jednostka: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .select('id, kod, nazwa, jednostka')
    .eq('aktywny', true)
    .order('kod');

  if (error) throw error;

  return (data || []) as { id: string; kod: string; nazwa: string; jednostka: string }[];
}

// --- CREATE podwykonawca ---

export async function createPodwykonawca(input: unknown): Promise<ActionResult<PodwykonawcaBase>> {
  const parsed = createPodwykonawcaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('podwykonawcy')
    .insert({
      nazwa: parsed.data.nazwa,
      specjalizacja: parsed.data.specjalizacja,
      kontakt: parsed.data.kontakt,
      aktywny: parsed.data.aktywny,
    })
    .select('id, nazwa, specjalizacja, kontakt, aktywny')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/podwykonawcy');
  return { success: true, data: data as PodwykonawcaBase };
}

// --- UPDATE podwykonawca ---

export async function updatePodwykonawca(id: string, input: unknown): Promise<ActionResult<PodwykonawcaBase>> {
  const parsed = updatePodwykonawcaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.specjalizacja !== undefined) updateData.specjalizacja = parsed.data.specjalizacja;
  if (parsed.data.kontakt !== undefined) updateData.kontakt = parsed.data.kontakt;
  if (parsed.data.aktywny !== undefined) updateData.aktywny = parsed.data.aktywny;

  const { data, error } = await supabase
    .from('podwykonawcy')
    .update(updateData)
    .eq('id', id)
    .select('id, nazwa, specjalizacja, kontakt, aktywny')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/podwykonawcy');
  return { success: true, data: data as PodwykonawcaBase };
}

// --- DELETE podwykonawca ---

export async function deletePodwykonawca(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check stawki count
  const { count: stawkiCount } = await supabase
    .from('stawki_podwykonawcow')
    .select('*', { count: 'exact', head: true })
    .eq('podwykonawca_id', id);

  if (stawkiCount && stawkiCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - podwykonawca ma ${stawkiCount} stawek w cenniku`,
    };
  }

  // Check usage in pozycje
  const { count: pozycjeCount } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('*', { count: 'exact', head: true })
    .eq('podwykonawca_id', id);

  if (pozycjeCount && pozycjeCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - podwykonawca jest używany w ${pozycjeCount} pozycjach`,
    };
  }

  const { error } = await supabase
    .from('podwykonawcy')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/podwykonawcy');
  return { success: true };
}

// --- CREATE stawka ---

export async function createStawka(input: unknown): Promise<ActionResult> {
  const parsed = createStawkaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('stawki_podwykonawcow')
    .insert({
      podwykonawca_id: parsed.data.podwykonawcaId,
      pozycja_biblioteka_id: parsed.data.pozycjaBibliotekaId,
      stawka: parsed.data.stawka,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ta pozycja jest już w cenniku tego podwykonawcy' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/podwykonawcy');
  return { success: true };
}

// --- UPDATE stawka ---

export async function updateStawka(id: string, input: unknown): Promise<ActionResult> {
  const parsed = updateStawkaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.stawka !== undefined) updateData.stawka = parsed.data.stawka;

  const { error } = await supabase
    .from('stawki_podwykonawcow')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/podwykonawcy');
  return { success: true };
}

// --- DELETE stawka ---

export async function deleteStawka(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('stawki_podwykonawcow')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/podwykonawcy');
  return { success: true };
}
