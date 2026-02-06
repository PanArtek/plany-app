'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/actions/projekty';
import { wpisCreateSchema } from '@/lib/validations/realizacja';

// --- Interfaces ---

export interface RealizacjaWpisRow {
  id: string;
  typ: string;
  opis: string | null;
  kwota_netto: number;
  numer_faktury: string | null;
  data_faktury: string | null;
  oplacone: boolean;
  zamowienie_id: string | null;
  zamowienie_numer: string | null;
  umowa_id: string | null;
  umowa_numer: string | null;
  created_at: string;
}

export interface RealizacjaStats {
  budzet: {
    planowane_r: number; planowane_m: number; planowane_razem: number;
    rzeczywiste_r: number; rzeczywiste_m: number; rzeczywiste_inne: number; rzeczywiste_razem: number;
  };
  zamowienia: { total: number; per_status: Record<string, number>; wartosc_total: number; };
  umowy: { total: number; per_status: Record<string, number>; avg_procent_wykonania: number; wartosc_total: number; };
}

// --- READ: Stats ---

export async function getRealizacjaStats(projektId: string): Promise<RealizacjaStats> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_realizacja_stats', { p_projekt_id: projektId });

  if (error) throw error;

  return data as RealizacjaStats;
}

// --- READ: Lista wpisów ---

export async function getRealizacjaWpisy(projektId: string): Promise<RealizacjaWpisRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('realizacja_wpisy')
    .select('*, zamowienia(numer), umowy(numer)')
    .eq('projekt_id', projektId)
    .order('data_faktury', { ascending: false, nullsFirst: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.map((row: Record<string, unknown>) => {
    const zam = row.zamowienia as Record<string, unknown> | null;
    const umowa = row.umowy as Record<string, unknown> | null;
    return {
      id: row.id as string,
      typ: row.typ as string,
      opis: row.opis as string | null,
      kwota_netto: Number(row.kwota_netto),
      numer_faktury: row.numer_faktury as string | null,
      data_faktury: row.data_faktury as string | null,
      oplacone: row.oplacone as boolean,
      zamowienie_id: row.zamowienie_id as string | null,
      zamowienie_numer: (zam?.numer as string) || null,
      umowa_id: row.umowa_id as string | null,
      umowa_numer: (umowa?.numer as string) || null,
      created_at: row.created_at as string,
    };
  });
}

// --- READ: Zamówienia for select ---

export async function getZamowieniaForSelect(projektId: string): Promise<{id: string, numer: string}[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('zamowienia')
    .select('id, numer')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: true });

  if (error) throw error;
  return (data || []).map((z: Record<string, unknown>) => ({
    id: z.id as string,
    numer: z.numer as string,
  }));
}

// --- READ: Umowy for select ---

export async function getUmowyForSelect(projektId: string): Promise<{id: string, numer: string}[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('umowy')
    .select('id, numer')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: true });

  if (error) throw error;
  return (data || []).map((u: Record<string, unknown>) => ({
    id: u.id as string,
    numer: u.numer as string,
  }));
}

// --- CREATE wpis ---

export async function createRealizacjaWpis(projektId: string, input: unknown): Promise<ActionResult> {
  const parsed = wpisCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Get organization_id from project
  const { data: projekt, error: pError } = await supabase
    .from('projekty')
    .select('organization_id')
    .eq('id', projektId)
    .single();

  if (pError || !projekt) {
    return { success: false, error: 'Projekt nie znaleziony' };
  }

  const { error } = await supabase
    .from('realizacja_wpisy')
    .insert({
      organization_id: projekt.organization_id,
      projekt_id: projektId,
      typ: parsed.data.typ,
      kwota_netto: parsed.data.kwota_netto,
      numer_faktury: parsed.data.numer_faktury || null,
      data_faktury: parsed.data.data_faktury || null,
      opis: parsed.data.opis || null,
      zamowienie_id: parsed.data.zamowienie_id || null,
      umowa_id: parsed.data.umowa_id || null,
      oplacone: parsed.data.oplacone,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${projektId}/realizacja`);
  return { success: true };
}

// --- UPDATE wpis ---

export async function updateRealizacjaWpis(id: string, projektId: string, input: unknown): Promise<ActionResult> {
  const parsed = wpisCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('realizacja_wpisy')
    .update({
      typ: parsed.data.typ,
      kwota_netto: parsed.data.kwota_netto,
      numer_faktury: parsed.data.numer_faktury || null,
      data_faktury: parsed.data.data_faktury || null,
      opis: parsed.data.opis || null,
      zamowienie_id: parsed.data.zamowienie_id || null,
      umowa_id: parsed.data.umowa_id || null,
      oplacone: parsed.data.oplacone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${projektId}/realizacja`);
  return { success: true };
}

// --- DELETE wpis ---

export async function deleteRealizacjaWpis(id: string, projektId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('realizacja_wpisy')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${projektId}/realizacja`);
  return { success: true };
}

// --- TOGGLE oplacone ---

export async function toggleOplacone(id: string, projektId: string, value: boolean): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('realizacja_wpisy')
    .update({ oplacone: value, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projekty/${projektId}/realizacja`);
  return { success: true };
}
