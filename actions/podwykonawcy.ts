'use server'

import { revalidatePath } from 'next/cache';
import { createClient, getOrganizationId } from '@/lib/supabase/server';
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
  minStawka: number | null;
  maxStawka: number | null;
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
  nazwa_pelna: string | null;
  nip: string | null;
  regon: string | null;
  krs: string | null;
  adres_siedziby: string | null;
  osoba_reprezentujaca: string | null;
  email: string | null;
  strona_www: string | null;
  nr_konta: string | null;
  uwagi: string | null;
  ocena: number | null;
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

  const { data, error } = await supabase.rpc('get_podwykonawcy_aggregated', {
    p_search: filters.search || null,
    p_specjalizacja: filters.specjalizacja || null,
    p_show_inactive: filters.showInactive || false,
    p_sort: filters.sort || 'nazwa',
    p_order: filters.order || 'asc',
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string;
    nazwa: string;
    specjalizacja: string | null;
    kontakt: string | null;
    aktywny: boolean;
    stawki_count: number;
    min_stawka: number | null;
    max_stawka: number | null;
    total_count: number;
  }>;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    data: rows.map(r => ({
      id: r.id,
      nazwa: r.nazwa,
      specjalizacja: r.specjalizacja,
      kontakt: r.kontakt,
      aktywny: r.aktywny,
      stawkiCount: Number(r.stawki_count),
      minStawka: r.min_stawka !== null ? Number(r.min_stawka) : null,
      maxStawka: r.max_stawka !== null ? Number(r.max_stawka) : null,
    })),
    totalCount,
    page,
    pageSize: PAGE_SIZE,
  };
}

// --- READ: Single podwykonawca ---

export async function getPodwykonawca(id: string): Promise<PodwykonawcaBase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('podwykonawcy')
    .select('id, nazwa, specjalizacja, kontakt, aktywny, nazwa_pelna, nip, regon, krs, adres_siedziby, osoba_reprezentujaca, email, strona_www, nr_konta, uwagi, ocena')
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

// --- STATS ---

export interface PodwykonawcyStats {
  total: number;
  totalStawki: number;
  avgStawka: number | null;
}

export async function getPodwykonawcyStats(): Promise<PodwykonawcyStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_podwykonawcy_stats');
  if (error) throw error;
  const row = (data as Array<Record<string, unknown>>)?.[0];
  return {
    total: Number(row?.total ?? 0),
    totalStawki: Number(row?.total_stawki ?? 0),
    avgStawka: row?.avg_stawka != null ? Number(row.avg_stawka) : null,
  };
}

// --- DISTINCT SPECJALIZACJE ---

export async function getDistinctSpecjalizacje(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('podwykonawcy')
    .select('specjalizacja')
    .eq('aktywny', true)
    .not('specjalizacja', 'is', null)
    .order('specjalizacja');

  if (error) throw error;
  const unique = [...new Set((data || []).map((d: { specjalizacja: string }) => d.specjalizacja))];
  return unique;
}

// --- CREATE podwykonawca ---

export async function createPodwykonawca(input: unknown): Promise<ActionResult<PodwykonawcaBase>> {
  const parsed = createPodwykonawcaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const organizationId = await getOrganizationId(supabase);

  const { data, error } = await supabase
    .from('podwykonawcy')
    .insert({
      organization_id: organizationId,
      nazwa: parsed.data.nazwa,
      specjalizacja: parsed.data.specjalizacja,
      kontakt: parsed.data.kontakt,
      aktywny: parsed.data.aktywny,
      nazwa_pelna: parsed.data.nazwa_pelna || null,
      nip: parsed.data.nip || null,
      regon: parsed.data.regon || null,
      krs: parsed.data.krs || null,
      adres_siedziby: parsed.data.adres_siedziby || null,
      osoba_reprezentujaca: parsed.data.osoba_reprezentujaca || null,
      email: parsed.data.email || null,
      strona_www: parsed.data.strona_www || null,
      nr_konta: parsed.data.nr_konta || null,
      uwagi: parsed.data.uwagi || null,
      ocena: parsed.data.ocena ?? null,
    })
    .select('id, nazwa, specjalizacja, kontakt, aktywny, nazwa_pelna, nip, regon, krs, adres_siedziby, osoba_reprezentujaca, email, strona_www, nr_konta, uwagi, ocena')
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
  if (parsed.data.nazwa_pelna !== undefined) updateData.nazwa_pelna = parsed.data.nazwa_pelna || null;
  if (parsed.data.nip !== undefined) updateData.nip = parsed.data.nip || null;
  if (parsed.data.regon !== undefined) updateData.regon = parsed.data.regon || null;
  if (parsed.data.krs !== undefined) updateData.krs = parsed.data.krs || null;
  if (parsed.data.adres_siedziby !== undefined) updateData.adres_siedziby = parsed.data.adres_siedziby || null;
  if (parsed.data.osoba_reprezentujaca !== undefined) updateData.osoba_reprezentujaca = parsed.data.osoba_reprezentujaca || null;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email || null;
  if (parsed.data.strona_www !== undefined) updateData.strona_www = parsed.data.strona_www || null;
  if (parsed.data.nr_konta !== undefined) updateData.nr_konta = parsed.data.nr_konta || null;
  if (parsed.data.uwagi !== undefined) updateData.uwagi = parsed.data.uwagi || null;
  if (parsed.data.ocena !== undefined) updateData.ocena = parsed.data.ocena ?? null;

  const { data, error } = await supabase
    .from('podwykonawcy')
    .update(updateData)
    .eq('id', id)
    .select('id, nazwa, specjalizacja, kontakt, aktywny, nazwa_pelna, nip, regon, krs, adres_siedziby, osoba_reprezentujaca, email, strona_www, nr_konta, uwagi, ocena')
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
