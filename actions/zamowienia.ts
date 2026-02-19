'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/actions/projekty';
import { zamowienieEditSchema, dostawaSchema } from '@/lib/validations/zamowienia';

// --- Interfaces ---

export interface ZamowienieRow {
  id: string;
  numer: string;
  status: string;
  dostawca_id: string;
  dostawca_nazwa: string;
  projekt_id: string;
  rewizja_id: string;
  data_zamowienia: string | null;
  data_dostawy_planowana: string | null;
  uwagi: string | null;
  created_at: string;
  pozycje_count: number;
  wartosc_total: number;
  dostarczone_ratio: string;
}

export interface ZamowieniePozycja {
  id: string;
  produkt_id: string;
  nazwa: string;
  jednostka: string | null;
  ilosc_zamowiona: number;
  cena_jednostkowa: number;
  wartosc: number;
  ilosc_dostarczona: number;
}

export interface ZamowienieDostawa {
  id: string;
  data_dostawy: string;
  numer_wz: string | null;
  uwagi: string | null;
  created_at: string;
  pozycje: { zamowienie_pozycja_id: string; ilosc_dostarczona: number }[];
}

export interface ZamowienieDetail extends ZamowienieRow {
  pozycje: ZamowieniePozycja[];
  dostawy: ZamowienieDostawa[];
}

// --- READ: Lista zamówień ---

export async function getZamowienia(projektId: string): Promise<ZamowienieRow[]> {
  const supabase = await createClient();

  const { data: zamowienia, error } = await supabase
    .from('zamowienia')
    .select('id, numer, status, dostawca_id, projekt_id, rewizja_id, data_zamowienia, data_dostawy_planowana, uwagi, created_at, dostawcy(nazwa)')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: true });

  if (error) throw error;
  if (!zamowienia || zamowienia.length === 0) return [];

  // Fetch pozycje aggregates for all zamówienia
  const zamIds = zamowienia.map((z: Record<string, unknown>) => z.id as string);
  const { data: pozycjeData } = await supabase
    .from('zamowienie_pozycje')
    .select('zamowienie_id, ilosc_zamowiona, cena_jednostkowa, ilosc_dostarczona')
    .in('zamowienie_id', zamIds);

  const aggregates: Record<string, { count: number; total: number; zamowiona: number; dostarczona: number }> = {};
  for (const p of (pozycjeData || [])) {
    const zId = p.zamowienie_id as string;
    if (!aggregates[zId]) aggregates[zId] = { count: 0, total: 0, zamowiona: 0, dostarczona: 0 };
    aggregates[zId].count++;
    aggregates[zId].total += Number(p.ilosc_zamowiona) * Number(p.cena_jednostkowa);
    aggregates[zId].zamowiona += Number(p.ilosc_zamowiona);
    aggregates[zId].dostarczona += Number(p.ilosc_dostarczona);
  }

  return zamowienia.map((z: Record<string, unknown>) => {
    const agg = aggregates[z.id as string] || { count: 0, total: 0, zamowiona: 0, dostarczona: 0 };
    const dostawca = z.dostawcy as unknown as Record<string, unknown> | null;
    return {
      id: z.id as string,
      numer: z.numer as string,
      status: z.status as string,
      dostawca_id: z.dostawca_id as string,
      dostawca_nazwa: (dostawca?.nazwa as string) || '—',
      projekt_id: z.projekt_id as string,
      rewizja_id: z.rewizja_id as string,
      data_zamowienia: z.data_zamowienia as string | null,
      data_dostawy_planowana: z.data_dostawy_planowana as string | null,
      uwagi: z.uwagi as string | null,
      created_at: z.created_at as string,
      pozycje_count: agg.count,
      wartosc_total: agg.total,
      dostarczone_ratio: `${Math.round(agg.dostarczona)}/${Math.round(agg.zamowiona)}`,
    };
  });
}

// --- READ: Detail zamówienia ---

export async function getZamowienie(id: string): Promise<ZamowienieDetail | null> {
  const supabase = await createClient();

  const { data: z, error } = await supabase
    .from('zamowienia')
    .select('id, numer, status, dostawca_id, projekt_id, rewizja_id, data_zamowienia, data_dostawy_planowana, uwagi, created_at, dostawcy(nazwa)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Fetch pozycje
  const { data: pozycjeData } = await supabase
    .from('zamowienie_pozycje')
    .select('id, produkt_id, nazwa, jednostka, ilosc_zamowiona, cena_jednostkowa, wartosc, ilosc_dostarczona')
    .eq('zamowienie_id', id)
    .order('nazwa', { ascending: true });

  const pozycje: ZamowieniePozycja[] = (pozycjeData || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    produkt_id: p.produkt_id as string,
    nazwa: p.nazwa as string,
    jednostka: p.jednostka as string | null,
    ilosc_zamowiona: Number(p.ilosc_zamowiona),
    cena_jednostkowa: Number(p.cena_jednostkowa),
    wartosc: Number(p.wartosc),
    ilosc_dostarczona: Number(p.ilosc_dostarczona),
  }));

  // Fetch dostawy + their pozycje
  const { data: dostawyData } = await supabase
    .from('zamowienie_dostawy')
    .select('id, data_dostawy, numer_wz, uwagi, created_at')
    .eq('zamowienie_id', id)
    .order('data_dostawy', { ascending: false });

  const dostawyIds = (dostawyData || []).map((d: Record<string, unknown>) => d.id as string);
  let dostawyPozycjeMap: Record<string, { zamowienie_pozycja_id: string; ilosc_dostarczona: number }[]> = {};

  if (dostawyIds.length > 0) {
    const { data: dpData } = await supabase
      .from('zamowienie_dostawy_pozycje')
      .select('zamowienie_dostawa_id, zamowienie_pozycja_id, ilosc_dostarczona')
      .in('zamowienie_dostawa_id', dostawyIds);

    for (const dp of (dpData || [])) {
      const dId = dp.zamowienie_dostawa_id as string;
      if (!dostawyPozycjeMap[dId]) dostawyPozycjeMap[dId] = [];
      dostawyPozycjeMap[dId].push({
        zamowienie_pozycja_id: dp.zamowienie_pozycja_id as string,
        ilosc_dostarczona: Number(dp.ilosc_dostarczona),
      });
    }
  }

  const dostawy: ZamowienieDostawa[] = (dostawyData || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    data_dostawy: d.data_dostawy as string,
    numer_wz: d.numer_wz as string | null,
    uwagi: d.uwagi as string | null,
    created_at: d.created_at as string,
    pozycje: dostawyPozycjeMap[d.id as string] || [],
  }));

  // Build aggregates for the row-level data
  let totalWartosc = 0;
  let totalZamowiona = 0;
  let totalDostarczona = 0;
  for (const p of pozycje) {
    totalWartosc += p.wartosc;
    totalZamowiona += p.ilosc_zamowiona;
    totalDostarczona += p.ilosc_dostarczona;
  }

  const dostawca = z.dostawcy as unknown as Record<string, unknown> | null;

  return {
    id: z.id as string,
    numer: z.numer as string,
    status: z.status as string,
    dostawca_id: z.dostawca_id as string,
    dostawca_nazwa: (dostawca?.nazwa as string) || '—',
    projekt_id: z.projekt_id as string,
    rewizja_id: z.rewizja_id as string,
    data_zamowienia: z.data_zamowienia as string | null,
    data_dostawy_planowana: z.data_dostawy_planowana as string | null,
    uwagi: z.uwagi as string | null,
    created_at: z.created_at as string,
    pozycje_count: pozycje.length,
    wartosc_total: totalWartosc,
    dostarczone_ratio: `${Math.round(totalDostarczona)}/${Math.round(totalZamowiona)}`,
    pozycje,
    dostawy,
  };
}

// --- Generate draft zamówienia ---

export async function generateZamowieniaDraft(projektId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Get project to find accepted_rewizja_id
  const { data: projekt, error: pError } = await supabase
    .from('projekty')
    .select('accepted_rewizja_id')
    .eq('id', projektId)
    .single();

  if (pError || !projekt?.accepted_rewizja_id) {
    return { success: false, error: 'Brak zaakceptowanej rewizji' };
  }

  const { error } = await supabase.rpc('generate_zamowienia_draft', {
    p_projekt_id: projektId,
    p_rewizja_id: projekt.accepted_rewizja_id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${projektId}/zamowienia`);
  return { success: true };
}

// --- UPDATE zamówienie (draft only) ---

export async function updateZamowienie(id: string, input: unknown): Promise<ActionResult> {
  const parsed = zamowienieEditSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('zamowienia')
    .update({
      data_zamowienia: parsed.data.data_zamowienia || null,
      data_dostawy_planowana: parsed.data.data_dostawy_planowana || null,
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

// --- DELETE zamówienie (draft only) ---

export async function deleteZamowienie(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('zamowienia')
    .delete()
    .eq('id', id)
    .eq('status', 'draft');

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- Change zamówienie status ---

export async function changeZamowienieStatus(id: string, newStatus: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Fetch current
  const { data: current, error: fetchError } = await supabase
    .from('zamowienia')
    .select('status, projekt_id')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return { success: false, error: 'Zamówienie nie znalezione' };
  }

  // Validate transitions
  const allowed: Record<string, string[]> = {
    draft: ['wyslane'],
    wyslane: ['czesciowo'],
    czesciowo: ['dostarczone'],
    dostarczone: ['rozliczone'],
  };

  if (!allowed[current.status]?.includes(newStatus)) {
    return { success: false, error: `Niedozwolona zmiana statusu z ${current.status} na ${newStatus}` };
  }

  const { error } = await supabase
    .from('zamowienia')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${current.projekt_id}/zamowienia`);
  return { success: true };
}

// --- Add dostawa ---

export async function addDostawa(
  zamowienieId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = dostawaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Get projekt_id for revalidation
  const { data: zam } = await supabase
    .from('zamowienia')
    .select('projekt_id')
    .eq('id', zamowienieId)
    .single();

  // Insert dostawa
  const { data: dostawa, error: dError } = await supabase
    .from('zamowienie_dostawy')
    .insert({
      zamowienie_id: zamowienieId,
      data_dostawy: parsed.data.data_dostawy,
      numer_wz: parsed.data.numer_wz || null,
      uwagi: parsed.data.uwagi || null,
    })
    .select('id')
    .single();

  if (dError || !dostawa) {
    return { success: false, error: dError?.message || 'Błąd tworzenia dostawy' };
  }

  // Insert pozycje
  const pozycjeInserts = parsed.data.pozycje.map((p) => ({
    zamowienie_dostawa_id: dostawa.id,
    zamowienie_pozycja_id: p.zamowienie_pozycja_id,
    ilosc_dostarczona: p.ilosc,
  }));

  const { error: pError } = await supabase
    .from('zamowienie_dostawy_pozycje')
    .insert(pozycjeInserts);

  if (pError) {
    return { success: false, error: pError.message };
  }

  if (zam?.projekt_id) {
    revalidatePath(`/projekty/${zam.projekt_id}/zamowienia`);
  }
  return { success: true };
}
