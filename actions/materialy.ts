'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createProduktSchema,
  updateProduktSchema,
  type MaterialyFilters,
} from '@/lib/validations/materialy';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// --- Interfaces ---

export interface ProduktWithAggregation {
  id: string;
  sku: string;
  nazwa: string;
  jednostka: string;
  aktywny: boolean;
  pozycjeCount: number;
  dostawcyCount: number;
  najlepszaCena: number | null;
  najgorszaCena: number | null;
}

export interface MaterialyResult {
  data: ProduktWithAggregation[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ProduktDostawca {
  id: string;
  dostawcaNazwa: string;
  dostawcaKod: string | null;
  cenaNetto: number;
  aktywny: boolean;
}

export interface ProduktPozycja {
  id: string;
  kod: string;
  nazwa: string;
}

export interface ProduktBase {
  id: string;
  sku: string;
  nazwa: string;
  jednostka: string;
  aktywny: boolean;
}

// --- Pagination ---

const PAGE_SIZE = 15;

// --- READ: Lista z filtrami (paginated, aggregated via RPC) ---

export async function getMaterialy(filters: MaterialyFilters): Promise<MaterialyResult> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { data, error } = await supabase.rpc('get_materialy_aggregated', {
    p_branza: filters.branza || null,
    p_kategoria: filters.kategoria || null,
    p_podkategoria: filters.podkategoria || null,
    p_search: filters.search || null,
    p_status_cenowy: filters.statusCenowy || null,
    p_show_inactive: filters.showInactive || false,
    p_sort: filters.sort || 'nazwa',
    p_order: filters.order || 'asc',
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string;
    sku: string;
    nazwa: string;
    jednostka: string;
    aktywny: boolean;
    pozycje_count: number;
    dostawcy_count: number;
    najlepsza_cena: number | null;
    najgorsza_cena: number | null;
    total_count: number;
  }>;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    data: rows.map(r => ({
      id: r.id,
      sku: r.sku,
      nazwa: r.nazwa,
      jednostka: r.jednostka,
      aktywny: r.aktywny,
      pozycjeCount: Number(r.pozycje_count),
      dostawcyCount: Number(r.dostawcy_count),
      najlepszaCena: r.najlepsza_cena !== null ? Number(r.najlepsza_cena) : null,
      najgorszaCena: r.najgorsza_cena !== null ? Number(r.najgorsza_cena) : null,
    })),
    totalCount,
    page,
    pageSize: PAGE_SIZE,
  };
}

// --- READ: Single product ---

export async function getProdukt(id: string): Promise<ProduktBase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('produkty')
    .select('id, sku, nazwa, jednostka, aktywny')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as ProduktBase;
}

// --- READ: Product's suppliers with prices ---

export async function getProduktDostawcy(produktId: string): Promise<ProduktDostawca[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ceny_dostawcow')
    .select(`
      id,
      cena_netto,
      aktywny,
      dostawcy!dostawca_id(nazwa, kod)
    `)
    .eq('produkt_id', produktId)
    .order('cena_netto', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => {
    const dostawca = row.dostawcy as { nazwa: string; kod: string | null } | null;
    return {
      id: row.id as string,
      dostawcaNazwa: dostawca?.nazwa ?? '',
      dostawcaKod: dostawca?.kod ?? null,
      cenaNetto: Number(row.cena_netto),
      aktywny: row.aktywny as boolean,
    };
  });
}

// --- READ: Positions using this product ---

export async function getProduktPozycje(produktId: string): Promise<ProduktPozycja[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('biblioteka_skladowe_materialy')
    .select(`
      pozycje_biblioteka!pozycja_biblioteka_id(id, kod, nazwa)
    `)
    .eq('produkt_id', produktId);

  if (error) throw error;

  return (data || []).map((row: Record<string, unknown>) => {
    const pozycja = row.pozycje_biblioteka as { id: string; kod: string; nazwa: string };
    return {
      id: pozycja.id,
      kod: pozycja.kod,
      nazwa: pozycja.nazwa,
    };
  });
}

// --- READ: All active products (for select dropdowns, no pagination) ---

export async function getAllProdukty(): Promise<{ id: string; sku: string; nazwa: string; jednostka: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('produkty')
    .select('id, sku, nazwa, jednostka')
    .eq('aktywny', true)
    .order('nazwa');

  if (error) throw error;
  return (data || []) as { id: string; sku: string; nazwa: string; jednostka: string }[];
}

// --- CREATE ---

export async function createProdukt(input: unknown): Promise<ActionResult<ProduktBase>> {
  const parsed = createProduktSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('produkty')
    .insert({
      sku: parsed.data.sku,
      nazwa: parsed.data.nazwa,
      jednostka: parsed.data.jednostka,
      aktywny: parsed.data.aktywny,
    })
    .select('id, sku, nazwa, jednostka, aktywny')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Produkt o tym SKU już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/materialy');
  return { success: true, data: data as ProduktBase };
}

// --- UPDATE ---

export async function updateProdukt(id: string, input: unknown): Promise<ActionResult<ProduktBase>> {
  const parsed = updateProduktSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.sku !== undefined) updateData.sku = parsed.data.sku;
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.jednostka !== undefined) updateData.jednostka = parsed.data.jednostka;
  if (parsed.data.aktywny !== undefined) updateData.aktywny = parsed.data.aktywny;

  const { data, error } = await supabase
    .from('produkty')
    .update(updateData)
    .eq('id', id)
    .select('id, sku, nazwa, jednostka, aktywny')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Produkt o tym SKU już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/materialy');
  return { success: true, data: data as ProduktBase };
}

// --- STATS ---

export interface MaterialyStats {
  total: number;
  withSuppliers: number;
  withoutSuppliers: number;
  avgPrice: number | null;
}

export async function getMaterialyStats(): Promise<MaterialyStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_materialy_stats');
  if (error) throw error;
  const row = (data as Array<Record<string, unknown>>)?.[0];
  return {
    total: Number(row?.total ?? 0),
    withSuppliers: Number(row?.with_suppliers ?? 0),
    withoutSuppliers: Number(row?.without_suppliers ?? 0),
    avgPrice: row?.avg_price != null ? Number(row.avg_price) : null,
  };
}

// --- DELETE ---

export async function deleteProdukt(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check usage in ceny_dostawcow
  const { count: cenyCount } = await supabase
    .from('ceny_dostawcow')
    .select('*', { count: 'exact', head: true })
    .eq('produkt_id', id);

  if (cenyCount && cenyCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - produkt ma ${cenyCount} wpisów w cennikach dostawców`,
    };
  }

  // Check usage in biblioteka_skladowe_materialy
  const { count: pozycjeCount } = await supabase
    .from('biblioteka_skladowe_materialy')
    .select('*', { count: 'exact', head: true })
    .eq('produkt_id', id);

  if (pozycjeCount && pozycjeCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - produkt jest używany w ${pozycjeCount} pozycjach`,
    };
  }

  const { error } = await supabase
    .from('produkty')
    .update({ aktywny: false })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/materialy');
  return { success: true };
}
