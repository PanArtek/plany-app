'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/actions/projekty';
import { umowaEditSchema, wykonanieSchema } from '@/lib/validations/umowy';

// --- Interfaces ---

export interface UmowaRow {
  id: string;
  numer: string;
  status: string;
  podwykonawca_id: string;
  podwykonawca_nazwa: string;
  podwykonawca_specjalizacja: string | null;
  projekt_id: string;
  rewizja_id: string;
  data_podpisania: string | null;
  warunki_platnosci: string | null;
  uwagi: string | null;
  created_at: string;
  pozycje_count: number;
  wartosc_total: number;
  avg_procent_wykonania: number;
}

export interface UmowaPozycja {
  id: string;
  pozycja_biblioteka_id: string | null;
  nazwa: string;
  jednostka: string | null;
  ilosc: number;
  stawka: number;
  wartosc: number;
  ilosc_wykonana: number;
  procent_wykonania: number;
}

export interface UmowaWykonanie {
  id: string;
  umowa_pozycja_id: string;
  data_wpisu: string;
  ilosc_wykonana: number;
  uwagi: string | null;
  created_at: string;
}

export interface UmowaDetail extends UmowaRow {
  pozycje: UmowaPozycja[];
  wykonanie: UmowaWykonanie[];
}

// --- READ: Lista umów ---

export async function getUmowy(projektId: string): Promise<UmowaRow[]> {
  const supabase = await createClient();

  const { data: umowy, error } = await supabase
    .from('umowy')
    .select('id, numer, status, podwykonawca_id, projekt_id, rewizja_id, data_podpisania, warunki_platnosci, uwagi, created_at, podwykonawcy(nazwa, specjalizacja)')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: true });

  if (error) throw error;
  if (!umowy || umowy.length === 0) return [];

  // Fetch pozycje aggregates
  const umIds = umowy.map((u: Record<string, unknown>) => u.id as string);
  const { data: pozycjeData } = await supabase
    .from('umowa_pozycje')
    .select('umowa_id, ilosc, stawka, procent_wykonania')
    .in('umowa_id', umIds);

  const aggregates: Record<string, { count: number; total: number; sumProcent: number }> = {};
  for (const p of (pozycjeData || [])) {
    const uId = p.umowa_id as string;
    if (!aggregates[uId]) aggregates[uId] = { count: 0, total: 0, sumProcent: 0 };
    aggregates[uId].count++;
    aggregates[uId].total += Number(p.ilosc) * Number(p.stawka);
    aggregates[uId].sumProcent += Number(p.procent_wykonania || 0);
  }

  return umowy.map((u: Record<string, unknown>) => {
    const agg = aggregates[u.id as string] || { count: 0, total: 0, sumProcent: 0 };
    const podwykonawca = u.podwykonawcy as unknown as Record<string, unknown> | null;
    return {
      id: u.id as string,
      numer: u.numer as string,
      status: u.status as string,
      podwykonawca_id: u.podwykonawca_id as string,
      podwykonawca_nazwa: (podwykonawca?.nazwa as string) || '—',
      podwykonawca_specjalizacja: (podwykonawca?.specjalizacja as string | null) || null,
      projekt_id: u.projekt_id as string,
      rewizja_id: u.rewizja_id as string,
      data_podpisania: u.data_podpisania as string | null,
      warunki_platnosci: u.warunki_platnosci as string | null,
      uwagi: u.uwagi as string | null,
      created_at: u.created_at as string,
      pozycje_count: agg.count,
      wartosc_total: agg.total,
      avg_procent_wykonania: agg.count > 0 ? Math.round(agg.sumProcent / agg.count) : 0,
    };
  });
}

// --- READ: Detail umowy ---

export async function getUmowa(id: string): Promise<UmowaDetail | null> {
  const supabase = await createClient();

  const { data: u, error } = await supabase
    .from('umowy')
    .select('id, numer, status, podwykonawca_id, projekt_id, rewizja_id, data_podpisania, warunki_platnosci, uwagi, created_at, podwykonawcy(nazwa, specjalizacja)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Fetch pozycje
  const { data: pozycjeData } = await supabase
    .from('umowa_pozycje')
    .select('id, pozycja_biblioteka_id, nazwa, jednostka, ilosc, stawka, wartosc, ilosc_wykonana, procent_wykonania')
    .eq('umowa_id', id)
    .order('nazwa', { ascending: true });

  const pozycje: UmowaPozycja[] = (pozycjeData || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    pozycja_biblioteka_id: p.pozycja_biblioteka_id as string | null,
    nazwa: p.nazwa as string,
    jednostka: p.jednostka as string | null,
    ilosc: Number(p.ilosc),
    stawka: Number(p.stawka),
    wartosc: Number(p.wartosc),
    ilosc_wykonana: Number(p.ilosc_wykonana),
    procent_wykonania: Number(p.procent_wykonania || 0),
  }));

  // Fetch wykonanie for all pozycje of this umowa
  const pozycjeIds = pozycje.map((p) => p.id);
  let wykonanie: UmowaWykonanie[] = [];

  if (pozycjeIds.length > 0) {
    const { data: wykData } = await supabase
      .from('umowa_wykonanie')
      .select('id, umowa_pozycja_id, data_wpisu, ilosc_wykonana, uwagi, created_at')
      .in('umowa_pozycja_id', pozycjeIds)
      .order('data_wpisu', { ascending: false });

    wykonanie = (wykData || []).map((w: Record<string, unknown>) => ({
      id: w.id as string,
      umowa_pozycja_id: w.umowa_pozycja_id as string,
      data_wpisu: w.data_wpisu as string,
      ilosc_wykonana: Number(w.ilosc_wykonana),
      uwagi: w.uwagi as string | null,
      created_at: w.created_at as string,
    }));
  }

  // Aggregates
  let totalWartosc = 0;
  let sumProcent = 0;
  for (const p of pozycje) {
    totalWartosc += p.wartosc;
    sumProcent += p.procent_wykonania;
  }

  const podwykonawca = u.podwykonawcy as unknown as Record<string, unknown> | null;

  return {
    id: u.id as string,
    numer: u.numer as string,
    status: u.status as string,
    podwykonawca_id: u.podwykonawca_id as string,
    podwykonawca_nazwa: (podwykonawca?.nazwa as string) || '—',
    podwykonawca_specjalizacja: (podwykonawca?.specjalizacja as string | null) || null,
    projekt_id: u.projekt_id as string,
    rewizja_id: u.rewizja_id as string,
    data_podpisania: u.data_podpisania as string | null,
    warunki_platnosci: u.warunki_platnosci as string | null,
    uwagi: u.uwagi as string | null,
    created_at: u.created_at as string,
    pozycje_count: pozycje.length,
    wartosc_total: totalWartosc,
    avg_procent_wykonania: pozycje.length > 0 ? Math.round(sumProcent / pozycje.length) : 0,
    pozycje,
    wykonanie,
  };
}

// --- Generate draft umowy ---

export async function generateUmowyDraft(projektId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: projekt, error: pError } = await supabase
    .from('projekty')
    .select('accepted_rewizja_id')
    .eq('id', projektId)
    .single();

  if (pError || !projekt?.accepted_rewizja_id) {
    return { success: false, error: 'Brak zaakceptowanej rewizji' };
  }

  const { error } = await supabase.rpc('generate_umowy_draft', {
    p_projekt_id: projektId,
    p_rewizja_id: projekt.accepted_rewizja_id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${projektId}/umowy`);
  return { success: true };
}

// --- UPDATE umowa (draft only) ---

export async function updateUmowa(id: string, input: unknown): Promise<ActionResult> {
  const parsed = umowaEditSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('umowy')
    .update({
      data_podpisania: parsed.data.data_podpisania || null,
      warunki_platnosci: parsed.data.warunki_platnosci || null,
      uwagi: parsed.data.uwagi || null,
    })
    .eq('id', id)
    .eq('status', 'draft');

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- DELETE umowa (draft only) ---

export async function deleteUmowa(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('umowy')
    .delete()
    .eq('id', id)
    .eq('status', 'draft');

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- Change umowa status ---

export async function changeUmowaStatus(id: string, newStatus: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('umowy')
    .select('status, projekt_id')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return { success: false, error: 'Umowa nie znaleziona' };
  }

  const allowed: Record<string, string[]> = {
    draft: ['wyslana'],
    wyslana: ['podpisana'],
    podpisana: ['wykonana'],
    wykonana: ['rozliczona'],
  };

  if (!allowed[current.status]?.includes(newStatus)) {
    return { success: false, error: `Niedozwolona zmiana statusu z ${current.status} na ${newStatus}` };
  }

  const { error } = await supabase
    .from('umowy')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${current.projekt_id}/umowy`);
  return { success: true };
}

// --- Add wykonanie ---

export async function addWykonanie(
  umowaPozycjaId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = wykonanieSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Get umowa's projekt_id for revalidation
  const { data: pozycja } = await supabase
    .from('umowa_pozycje')
    .select('umowa_id')
    .eq('id', umowaPozycjaId)
    .single();

  let projektId: string | null = null;
  if (pozycja) {
    const { data: umowa } = await supabase
      .from('umowy')
      .select('projekt_id')
      .eq('id', pozycja.umowa_id)
      .single();
    projektId = umowa?.projekt_id || null;
  }

  const { error } = await supabase
    .from('umowa_wykonanie')
    .insert({
      umowa_pozycja_id: umowaPozycjaId,
      data_wpisu: parsed.data.data_wpisu,
      ilosc_wykonana: parsed.data.ilosc_wykonana,
      uwagi: parsed.data.uwagi || null,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  if (projektId) {
    revalidatePath(`/projekty/${projektId}/umowy`);
  }
  return { success: true };
}
