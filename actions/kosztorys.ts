'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  updateKosztorysPozycjaSchema,
  updateSkladowaRSchema,
  updateSkladowaMSchema,
  type LibraryFilters,
} from '@/lib/validations/kosztorys';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// --- Interfaces ---

export interface KosztorysPozycjaView {
  id: string;
  organization_id: string;
  rewizja_id: string;
  pozycja_biblioteka_id: string | null;
  lp: number;
  nazwa: string;
  ilosc: number;
  jednostka: string | null;
  narzut_percent: number;
  notatki: string | null;
  r_jednostkowy: number;
  m_jednostkowy: number;
  r_robocizna: number;
  m_materialy: number;
  r_plus_m: number;
  narzut_wartosc: number;
  razem: number;
  // Extended fields from join
  kod: string | null;
  branza_nazwa: string | null;
  kategoria_nazwa: string | null;
}

export interface RewizjaInfo {
  id: string;
  numer: number;
  nazwa: string | null;
  is_locked: boolean;
  is_accepted: boolean;
  created_at: string;
}

export interface ProjektInfo {
  id: string;
  nazwa: string;
  slug: string;
  powierzchnia: number | null;
}

export interface KosztorysData {
  projekt: ProjektInfo;
  rewizje: RewizjaInfo[];
  rewizja: RewizjaInfo;
  pozycje: KosztorysPozycjaView[];
}

export interface SkladowaR {
  id: string;
  lp: number;
  opis: string;
  podwykonawca_id: string | null;
  stawka: number;
  norma: number;
  ilosc: number | null;
  jednostka: string;
  is_manual: boolean;
}

export interface SkladowaM {
  id: string;
  lp: number;
  nazwa: string;
  produkt_id: string | null;
  dostawca_id: string | null;
  cena: number;
  norma: number;
  ilosc: number | null;
  jednostka: string | null;
  is_manual: boolean;
}

export interface NameIdPair {
  id: string;
  nazwa: string;
}

export interface KosztorysPozycjaDetail {
  pozycja: {
    id: string;
    lp: number;
    nazwa: string;
    ilosc: number;
    jednostka: string | null;
    narzut_percent: number;
    notatki: string | null;
    pozycja_biblioteka_id: string | null;
    kod: string | null;
  };
  skladoweR: SkladowaR[];
  skladoweM: SkladowaM[];
  podwykonawcy: NameIdPair[];
  dostawcy: NameIdPair[];
}

export interface LibraryPosition {
  id: string;
  kod: string;
  nazwa: string;
  jednostka: string;
  skladoweRCount: number;
  skladoweMCount: number;
}

export interface LibraryPositionsResult {
  data: LibraryPosition[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const LIBRARY_PAGE_SIZE = 20;

// --- READ: Kosztorys data (projekt + rewizje + pozycje) ---

export async function getKosztorysData(
  projektId: string,
  rewizjaId?: string
): Promise<ActionResult<KosztorysData>> {
  const supabase = await createClient();

  // 1. Fetch projekt
  const { data: projekt, error: projektError } = await supabase
    .from('projekty')
    .select('id, nazwa, slug, powierzchnia')
    .eq('id', projektId)
    .single();

  if (projektError) {
    if (projektError.code === 'PGRST116') {
      return { success: false, error: 'Projekt nie znaleziony' };
    }
    return { success: false, error: projektError.message };
  }

  // 2. Fetch all rewizje for this projekt
  const { data: rewizje, error: rewizjeError } = await supabase
    .from('rewizje')
    .select('id, numer, nazwa, is_locked, is_accepted, created_at')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: true });

  if (rewizjeError) {
    return { success: false, error: rewizjeError.message };
  }

  if (!rewizje || rewizje.length === 0) {
    return { success: false, error: 'Brak rewizji dla tego projektu' };
  }

  // 3. Select active rewizja
  let activeRewizja: RewizjaInfo;

  if (rewizjaId) {
    const found = rewizje.find((r) => r.id === rewizjaId);
    if (!found) {
      return { success: false, error: 'Rewizja nie znaleziona' };
    }
    activeRewizja = found as RewizjaInfo;
  } else {
    // Latest unlocked, fallback to latest overall
    const unlocked = rewizje.filter((r) => !r.is_locked);
    activeRewizja = (unlocked.length > 0
      ? unlocked[unlocked.length - 1]
      : rewizje[rewizje.length - 1]) as RewizjaInfo;
  }

  // 4. Fetch pozycje from view with joined kod from pozycje_biblioteka
  const { data: pozycjeRaw, error: pozycjeError } = await supabase
    .from('kosztorys_pozycje_view')
    .select(`
      id,
      organization_id,
      rewizja_id,
      pozycja_biblioteka_id,
      lp,
      nazwa,
      ilosc,
      jednostka,
      narzut_percent,
      notatki,
      r_jednostkowy,
      m_jednostkowy,
      r_robocizna,
      m_materialy,
      r_plus_m,
      narzut_wartosc,
      razem,
      pozycje_biblioteka!pozycja_biblioteka_id(kod, kategoria_id, kategorie!kategoria_id(nazwa, parent:kategorie!parent_id(nazwa)))
    `)
    .eq('rewizja_id', activeRewizja.id)
    .order('lp', { ascending: true });

  if (pozycjeError) {
    return { success: false, error: pozycjeError.message };
  }

  const pozycje: KosztorysPozycjaView[] = (pozycjeRaw || []).map((row: Record<string, unknown>) => {
    const pb = row.pozycje_biblioteka as {
      kod: string;
      kategoria_id: string;
      kategorie: { nazwa: string; parent: { nazwa: string } | null } | null;
    } | null;

    return {
      id: row.id as string,
      organization_id: row.organization_id as string,
      rewizja_id: row.rewizja_id as string,
      pozycja_biblioteka_id: row.pozycja_biblioteka_id as string | null,
      lp: Number(row.lp),
      nazwa: row.nazwa as string,
      ilosc: Number(row.ilosc),
      jednostka: row.jednostka as string | null,
      narzut_percent: Number(row.narzut_percent),
      notatki: row.notatki as string | null,
      r_jednostkowy: Number(row.r_jednostkowy ?? 0),
      m_jednostkowy: Number(row.m_jednostkowy ?? 0),
      r_robocizna: Number(row.r_robocizna ?? 0),
      m_materialy: Number(row.m_materialy ?? 0),
      r_plus_m: Number(row.r_plus_m ?? 0),
      narzut_wartosc: Number(row.narzut_wartosc ?? 0),
      razem: Number(row.razem ?? 0),
      kod: pb?.kod ?? null,
      branza_nazwa: pb?.kategorie?.parent?.nazwa ?? null,
      kategoria_nazwa: pb?.kategorie?.nazwa ?? null,
    };
  });

  return {
    success: true,
    data: {
      projekt: projekt as ProjektInfo,
      rewizje: rewizje as RewizjaInfo[],
      rewizja: activeRewizja,
      pozycje,
    },
  };
}

// --- READ: Pozycja detail with składowe ---

export async function getKosztorysPozycjaDetail(
  pozycjaId: string
): Promise<ActionResult<KosztorysPozycjaDetail>> {
  const supabase = await createClient();

  // 1. Fetch pozycja
  const { data: pozycja, error: pozycjaError } = await supabase
    .from('kosztorys_pozycje')
    .select(`
      id, lp, nazwa, ilosc, jednostka, narzut_percent, notatki, pozycja_biblioteka_id,
      pozycje_biblioteka!pozycja_biblioteka_id(kod)
    `)
    .eq('id', pozycjaId)
    .single();

  if (pozycjaError) {
    if (pozycjaError.code === 'PGRST116') {
      return { success: false, error: 'Pozycja nie znaleziona' };
    }
    return { success: false, error: pozycjaError.message };
  }

  const pb = (pozycja as Record<string, unknown>).pozycje_biblioteka as { kod: string } | null;

  // 2. Fetch składowe robocizna
  const { data: skladoweR, error: rError } = await supabase
    .from('kosztorys_skladowe_robocizna')
    .select('id, lp, opis, podwykonawca_id, stawka, norma, ilosc, jednostka, is_manual')
    .eq('kosztorys_pozycja_id', pozycjaId)
    .order('lp', { ascending: true });

  if (rError) {
    return { success: false, error: rError.message };
  }

  // 3. Fetch składowe materiały
  const { data: skladoweM, error: mError } = await supabase
    .from('kosztorys_skladowe_materialy')
    .select('id, lp, nazwa, produkt_id, dostawca_id, cena, norma, ilosc, jednostka, is_manual')
    .eq('kosztorys_pozycja_id', pozycjaId)
    .order('lp', { ascending: true });

  if (mError) {
    return { success: false, error: mError.message };
  }

  // 4. Fetch dropdown lists
  const [podwykonawcyResult, dostawcyResult] = await Promise.all([
    supabase
      .from('podwykonawcy')
      .select('id, nazwa')
      .eq('aktywny', true)
      .order('nazwa'),
    supabase
      .from('dostawcy')
      .select('id, nazwa')
      .eq('aktywny', true)
      .order('nazwa'),
  ]);

  return {
    success: true,
    data: {
      pozycja: {
        id: pozycja.id as string,
        lp: Number(pozycja.lp),
        nazwa: pozycja.nazwa as string,
        ilosc: Number(pozycja.ilosc),
        jednostka: pozycja.jednostka as string | null,
        narzut_percent: Number(pozycja.narzut_percent),
        notatki: pozycja.notatki as string | null,
        pozycja_biblioteka_id: pozycja.pozycja_biblioteka_id as string | null,
        kod: pb?.kod ?? null,
      },
      skladoweR: (skladoweR || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        lp: Number(r.lp),
        opis: r.opis as string,
        podwykonawca_id: r.podwykonawca_id as string | null,
        stawka: Number(r.stawka),
        norma: Number(r.norma),
        ilosc: r.ilosc != null ? Number(r.ilosc) : null,
        jednostka: r.jednostka as string,
        is_manual: r.is_manual as boolean,
      })),
      skladoweM: (skladoweM || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        lp: Number(m.lp),
        nazwa: m.nazwa as string,
        produkt_id: m.produkt_id as string | null,
        dostawca_id: m.dostawca_id as string | null,
        cena: Number(m.cena),
        norma: Number(m.norma),
        ilosc: m.ilosc != null ? Number(m.ilosc) : null,
        jednostka: m.jednostka as string | null,
        is_manual: m.is_manual as boolean,
      })),
      podwykonawcy: (podwykonawcyResult.data || []) as NameIdPair[],
      dostawcy: (dostawcyResult.data || []) as NameIdPair[],
    },
  };
}

// --- READ: Library positions for adding to kosztorys ---

export async function getLibraryPositions(
  filters: LibraryFilters
): Promise<ActionResult<LibraryPositionsResult>> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * LIBRARY_PAGE_SIZE;

  let query = supabase
    .from('pozycje_biblioteka')
    .select('id, kod, nazwa, jednostka', { count: 'exact' })
    .eq('aktywny', true)
    .order('kod')
    .range(offset, offset + LIBRARY_PAGE_SIZE - 1);

  if (filters.search) {
    query = query.ilike('nazwa', `%${filters.search}%`);
  }

  if (filters.branza) {
    query = query.like('kod', `${filters.branza}%`);
  }

  if (filters.kategoria) {
    query = query.like('kod', `${filters.kategoria}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Fetch składowe counts for these positions
  const ids = (data || []).map((d: { id: string }) => d.id);
  let rCounts: Record<string, number> = {};
  let mCounts: Record<string, number> = {};

  if (ids.length > 0) {
    const [rResult, mResult] = await Promise.all([
      supabase
        .from('biblioteka_skladowe_robocizna')
        .select('pozycja_biblioteka_id')
        .in('pozycja_biblioteka_id', ids),
      supabase
        .from('biblioteka_skladowe_materialy')
        .select('pozycja_biblioteka_id')
        .in('pozycja_biblioteka_id', ids),
    ]);

    if (rResult.data) {
      rCounts = (rResult.data as { pozycja_biblioteka_id: string }[]).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.pozycja_biblioteka_id] = (acc[row.pozycja_biblioteka_id] || 0) + 1;
          return acc;
        },
        {}
      );
    }

    if (mResult.data) {
      mCounts = (mResult.data as { pozycja_biblioteka_id: string }[]).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.pozycja_biblioteka_id] = (acc[row.pozycja_biblioteka_id] || 0) + 1;
          return acc;
        },
        {}
      );
    }
  }

  return {
    success: true,
    data: {
      data: (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        kod: d.kod as string,
        nazwa: d.nazwa as string,
        jednostka: d.jednostka as string,
        skladoweRCount: rCounts[d.id as string] || 0,
        skladoweMCount: mCounts[d.id as string] || 0,
      })),
      totalCount: count ?? 0,
      page,
      pageSize: LIBRARY_PAGE_SIZE,
    },
  };
}

// --- WRITE: Add position from library (COPY pattern) ---

export async function addPositionFromLibrary(
  rewizjaId: string,
  pozycjaBibliotekaId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Fetch library position
  const { data: libPozycja, error: libError } = await supabase
    .from('pozycje_biblioteka')
    .select('id, nazwa, jednostka')
    .eq('id', pozycjaBibliotekaId)
    .single();

  if (libError || !libPozycja) {
    return { success: false, error: 'Pozycja biblioteki nie znaleziona' };
  }

  // 2. Get next lp
  const { data: maxLpData } = await supabase
    .from('kosztorys_pozycje')
    .select('lp')
    .eq('rewizja_id', rewizjaId)
    .order('lp', { ascending: false })
    .limit(1);

  const nextLp = maxLpData && maxLpData.length > 0
    ? (maxLpData[0] as { lp: number }).lp + 1
    : 1;

  // 3. Get organization_id from rewizja -> projekt
  const { data: rewizja, error: rewError } = await supabase
    .from('rewizje')
    .select('projekt_id, projekty!projekt_id(organization_id)')
    .eq('id', rewizjaId)
    .single();

  if (rewError || !rewizja) {
    return { success: false, error: 'Rewizja nie znaleziona' };
  }

  const organizationId = (
    (rewizja as Record<string, unknown>).projekty as { organization_id: string }
  ).organization_id;

  // 4. Insert kosztorys position
  const { data: newPozycja, error: insertError } = await supabase
    .from('kosztorys_pozycje')
    .insert({
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pozycjaBibliotekaId,
      organization_id: organizationId,
      lp: nextLp,
      nazwa: libPozycja.nazwa as string,
      jednostka: libPozycja.jednostka as string,
      ilosc: 1,
      narzut_percent: 30,
    })
    .select('id')
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const pozycjaId = (newPozycja as { id: string }).id;

  // 5. Copy składowe robocizna from library
  const { data: libRobocizna } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('lp, opis, norma_domyslna, stawka_domyslna, jednostka')
    .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
    .order('lp');

  if (libRobocizna && libRobocizna.length > 0) {
    // Find cheapest subcontractor rates for this library position
    const { data: stawki } = await supabase
      .from('stawki_podwykonawcow')
      .select('pozycja_biblioteka_id, podwykonawca_id, cena_netto')
      .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
      .order('cena_netto', { ascending: true });

    const cheapestStawka = stawki && stawki.length > 0
      ? { stawka: Number((stawki[0] as Record<string, unknown>).cena_netto), podwykonawca_id: (stawki[0] as Record<string, unknown>).podwykonawca_id as string }
      : null;

    const robociznaInserts = (libRobocizna as Record<string, unknown>[]).map((r) => ({
      kosztorys_pozycja_id: pozycjaId,
      lp: Number(r.lp),
      opis: r.opis as string,
      norma: Number(r.norma_domyslna ?? 1),
      jednostka: (r.jednostka as string) || 'h',
      stawka: cheapestStawka?.stawka ?? Number(r.stawka_domyslna ?? 0),
      podwykonawca_id: cheapestStawka?.podwykonawca_id ?? null,
    }));

    await supabase.from('kosztorys_skladowe_robocizna').insert(robociznaInserts);
  }

  // 6. Copy składowe materiały from library
  const { data: libMaterialy } = await supabase
    .from('biblioteka_skladowe_materialy')
    .select('lp, nazwa, norma_domyslna, cena_domyslna, jednostka, produkt_id')
    .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
    .order('lp');

  if (libMaterialy && libMaterialy.length > 0) {
    const materialyInserts = await Promise.all(
      (libMaterialy as Record<string, unknown>[]).map(async (m) => {
        let cena = Number(m.cena_domyslna ?? 0);
        let dostawcaId: string | null = null;

        // Find cheapest supplier price for this product
        if (m.produkt_id) {
          const { data: ceny } = await supabase
            .from('ceny_dostawcow')
            .select('dostawca_id, cena_netto')
            .eq('produkt_id', m.produkt_id as string)
            .eq('aktywny', true)
            .order('cena_netto', { ascending: true })
            .limit(1);

          if (ceny && ceny.length > 0) {
            cena = Number((ceny[0] as Record<string, unknown>).cena_netto);
            dostawcaId = (ceny[0] as Record<string, unknown>).dostawca_id as string;
          }
        }

        return {
          kosztorys_pozycja_id: pozycjaId,
          lp: Number(m.lp),
          nazwa: m.nazwa as string,
          norma: Number(m.norma_domyslna ?? 1),
          jednostka: m.jednostka as string | null,
          cena,
          produkt_id: m.produkt_id as string | null,
          dostawca_id: dostawcaId,
        };
      })
    );

    await supabase.from('kosztorys_skladowe_materialy').insert(materialyInserts);
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Update kosztorys position ---

export async function updateKosztorysPozycja(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateKosztorysPozycjaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.ilosc !== undefined) updateData.ilosc = parsed.data.ilosc;
  if (parsed.data.jednostka !== undefined) updateData.jednostka = parsed.data.jednostka;
  if (parsed.data.narzut_percent !== undefined) updateData.narzut_percent = parsed.data.narzut_percent;
  if (parsed.data.notatki !== undefined) updateData.notatki = parsed.data.notatki;

  const { error } = await supabase
    .from('kosztorys_pozycje')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Update składowa robocizna ---

export async function updateKosztorysSkladowaR(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateSkladowaRSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    stawka: parsed.data.stawka,
  };
  if (parsed.data.podwykonawca_id !== undefined) {
    updateData.podwykonawca_id = parsed.data.podwykonawca_id;
  }

  const { error } = await supabase
    .from('kosztorys_skladowe_robocizna')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Update składowa materiały ---

export async function updateKosztorysSkladowaM(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateSkladowaMSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    cena: parsed.data.cena,
  };
  if (parsed.data.dostawca_id !== undefined) {
    updateData.dostawca_id = parsed.data.dostawca_id;
  }

  const { error } = await supabase
    .from('kosztorys_skladowe_materialy')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Delete positions ---

export async function deleteKosztorysPozycje(
  ids: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('kosztorys_pozycje')
    .delete()
    .in('id', ids);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Copy revision ---

export async function copyRevision(
  rewizjaId: string
): Promise<ActionResult<{ id: string; numer: number }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('copy_revision', {
    source_rewizja_id: rewizjaId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Fetch the new revision info
  const { data: newRewizja, error: fetchError } = await supabase
    .from('rewizje')
    .select('id, numer')
    .eq('id', data as string)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  revalidatePath('/projekty');
  return {
    success: true,
    data: newRewizja as { id: string; numer: number },
  };
}
