'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  updateKosztorysPozycjaSchema,
  updateCenaRobociznySchema,
  updateSkladowaMSchema,
  updateSkladowaRSchema,
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
  status: string;
}

export interface KosztorysData {
  projekt: ProjektInfo;
  rewizje: RewizjaInfo[];
  rewizja: RewizjaInfo;
  pozycje: KosztorysPozycjaView[];
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

export interface SkladowaR {
  id: string;
  lp: number;
  opis: string;
  cena: number;
  cena_zrodlowa: number | null;
  podwykonawca_id: string | null;
}

export interface NameIdPair {
  id: string;
  nazwa: string;
}

export interface BibliotekaSkladowaM {
  id: string;
  lp: number;
  nazwa: string;
  cena_domyslna: number;
  norma_domyslna: number;
  jednostka: string | null;
}

export interface BibliotekaSkladowaR {
  id: string;
  lp: number;
  opis: string;
  cena: number;
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
    cena_robocizny: number;
    cena_robocizny_zrodlowa: number | null;
    cena_robocizny_zrodlo: string | null;
    podwykonawca_id: string | null;
  };
  skladoweM: SkladowaM[];
  skladoweR: SkladowaR[];
  bibliotekaSkladoweM: BibliotekaSkladowaM[];
  bibliotekaSkladoweR: BibliotekaSkladowaR[];
  podwykonawcy: NameIdPair[];
  dostawcy: NameIdPair[];
}

export interface LibraryPosition {
  id: string;
  kod: string;
  nazwa: string;
  jednostka: string;
  cenaRobocizny: number | null;
  skladoweMCount: number;
  skladoweRCount: number;
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
    .select('id, nazwa, slug, powierzchnia, status')
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

  // 1. Fetch pozycja with flat cena_robocizny fields
  const { data: pozycja, error: pozycjaError } = await supabase
    .from('kosztorys_pozycje')
    .select(`
      id, lp, nazwa, ilosc, jednostka, narzut_percent, notatki, pozycja_biblioteka_id,
      cena_robocizny, cena_robocizny_zrodlowa, cena_robocizny_zrodlo, podwykonawca_id,
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

  // 2. Fetch składowe materiały + robocizna
  const [skladoweMResult, skladoweRResult] = await Promise.all([
    supabase
      .from('kosztorys_skladowe_materialy')
      .select('id, lp, nazwa, produkt_id, dostawca_id, cena, norma, ilosc, jednostka, is_manual')
      .eq('kosztorys_pozycja_id', pozycjaId)
      .order('lp', { ascending: true }),
    supabase
      .from('kosztorys_skladowe_robocizna')
      .select('id, lp, opis, cena, cena_zrodlowa, podwykonawca_id')
      .eq('kosztorys_pozycja_id', pozycjaId)
      .order('lp', { ascending: true }),
  ]);

  if (skladoweMResult.error) {
    return { success: false, error: skladoweMResult.error.message };
  }
  if (skladoweRResult.error) {
    return { success: false, error: skladoweRResult.error.message };
  }

  const skladoweM = skladoweMResult.data;
  const skladoweR = skladoweRResult.data;

  // 3. Fetch dropdown lists + library skladowe in parallel
  const pozycjaBibliotekaId = pozycja.pozycja_biblioteka_id as string | null;

  const [podwykonawcyResult, dostawcyResult, libMResult, libRResult] = await Promise.all([
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
    // Fetch library skladowe materialy (for override indicators)
    pozycjaBibliotekaId
      ? supabase
          .from('biblioteka_skladowe_materialy')
          .select('id, lp, nazwa, cena_domyslna, norma_domyslna, jednostka')
          .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
          .order('lp', { ascending: true })
      : Promise.resolve({ data: null, error: null }),
    // Fetch library skladowe robocizna (for override indicators)
    pozycjaBibliotekaId
      ? supabase
          .from('biblioteka_skladowe_robocizna')
          .select('id, lp, opis, cena')
          .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
          .order('lp', { ascending: true })
      : Promise.resolve({ data: null, error: null }),
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
        cena_robocizny: Number(pozycja.cena_robocizny ?? 0),
        cena_robocizny_zrodlowa: pozycja.cena_robocizny_zrodlowa != null ? Number(pozycja.cena_robocizny_zrodlowa) : null,
        cena_robocizny_zrodlo: pozycja.cena_robocizny_zrodlo as string | null,
        podwykonawca_id: pozycja.podwykonawca_id as string | null,
      },
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
      skladoweR: (skladoweR || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        lp: Number(r.lp),
        opis: r.opis as string,
        cena: Number(r.cena),
        cena_zrodlowa: r.cena_zrodlowa != null ? Number(r.cena_zrodlowa) : null,
        podwykonawca_id: r.podwykonawca_id as string | null,
      })),
      bibliotekaSkladoweM: (libMResult.data || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        lp: Number(m.lp),
        nazwa: m.nazwa as string,
        cena_domyslna: Number(m.cena_domyslna ?? 0),
        norma_domyslna: Number(m.norma_domyslna ?? 1),
        jednostka: m.jednostka as string | null,
      })),
      bibliotekaSkladoweR: (libRResult.data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        lp: Number(r.lp),
        opis: r.opis as string,
        cena: Number(r.cena ?? 0),
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
    .select('id, kod, nazwa, jednostka, cena_robocizny', { count: 'exact' })
    .eq('aktywny', true)
    .order('kod')
    .range(offset, offset + LIBRARY_PAGE_SIZE - 1);

  if (filters.search) {
    query = query.or(`nazwa.ilike.%${filters.search}%,kod.ilike.%${filters.search}%`);
  }

  // Cascading filters: podkategoriaId > kategoriaId > branza
  if (filters.podkategoriaId) {
    query = query.eq('kategoria_id', filters.podkategoriaId);
  } else if (filters.kategoriaId) {
    // Positions in kategoria OR any of its podkategorie
    const { data: children } = await supabase
      .from('kategorie')
      .select('id')
      .eq('parent_id', filters.kategoriaId);
    const childIds = (children || []).map((c: { id: string }) => c.id);
    const allIds = [filters.kategoriaId, ...childIds];
    query = query.in('kategoria_id', allIds);
  } else if (filters.branza) {
    query = query.like('kod', `${filters.branza}%`);
  }

  if (filters.kategoria) {
    query = query.like('kod', `${filters.kategoria}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Fetch składowe materialy counts for these positions
  const ids = (data || []).map((d: { id: string }) => d.id);
  let mCounts: Record<string, number> = {};
  let rCounts: Record<string, number> = {};

  if (ids.length > 0) {
    const [mRes, rRes] = await Promise.all([
      supabase
        .from('biblioteka_skladowe_materialy')
        .select('pozycja_biblioteka_id')
        .in('pozycja_biblioteka_id', ids),
      supabase
        .from('biblioteka_skladowe_robocizna')
        .select('pozycja_biblioteka_id')
        .in('pozycja_biblioteka_id', ids),
    ]);

    if (mRes.data) {
      mCounts = (mRes.data as { pozycja_biblioteka_id: string }[]).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.pozycja_biblioteka_id] = (acc[row.pozycja_biblioteka_id] || 0) + 1;
          return acc;
        },
        {}
      );
    }

    if (rRes.data) {
      rCounts = (rRes.data as { pozycja_biblioteka_id: string }[]).reduce<Record<string, number>>(
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
        cenaRobocizny: d.cena_robocizny != null ? Number(d.cena_robocizny) : null,
        skladoweMCount: mCounts[d.id as string] || 0,
        skladoweRCount: rCounts[d.id as string] || 0,
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

  // 1. Fetch library position with cena_robocizny
  const { data: libPozycja, error: libError } = await supabase
    .from('pozycje_biblioteka')
    .select('id, nazwa, jednostka, cena_robocizny')
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

  // 4. Determine cena_robocizny with priority: cheapest subcontractor > library > 0
  let cenaRobocizny = 0;
  let cenaRobociznyZrodlo: 'biblioteka' | 'podwykonawca' | 'reczna' = 'reczna';
  let podwykonawcaId: string | null = null;

  // Check cheapest active subcontractor rate
  const { data: stawki } = await supabase
    .from('stawki_podwykonawcow')
    .select('podwykonawca_id, stawka')
    .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
    .eq('aktywny', true)
    .order('stawka', { ascending: true })
    .limit(1);

  if (stawki && stawki.length > 0) {
    cenaRobocizny = Number((stawki[0] as Record<string, unknown>).stawka);
    cenaRobociznyZrodlo = 'podwykonawca';
    podwykonawcaId = (stawki[0] as Record<string, unknown>).podwykonawca_id as string;
  } else if (libPozycja.cena_robocizny != null) {
    cenaRobocizny = Number(libPozycja.cena_robocizny);
    cenaRobociznyZrodlo = 'biblioteka';
  }

  // 5. Insert kosztorys position with flat cena_robocizny
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
      cena_robocizny: cenaRobocizny,
      cena_robocizny_zrodlowa: cenaRobocizny,
      cena_robocizny_zrodlo: cenaRobociznyZrodlo,
      podwykonawca_id: podwykonawcaId,
    })
    .select('id')
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const pozycjaId = (newPozycja as { id: string }).id;

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

  // 7. Copy składowe robocizna from library
  const { data: libRobocizna } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('lp, opis, cena, podwykonawca_id')
    .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
    .order('lp');

  if (libRobocizna && libRobocizna.length > 0) {
    const robociznaInserts = (libRobocizna as Record<string, unknown>[]).map((r) => ({
      kosztorys_pozycja_id: pozycjaId,
      lp: Number(r.lp),
      opis: r.opis as string,
      cena: Number(r.cena ?? 0),
      cena_zrodlowa: Number(r.cena ?? 0),
      podwykonawca_id: r.podwykonawca_id as string | null,
    }));

    await supabase.from('kosztorys_skladowe_robocizna').insert(robociznaInserts);
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

// --- WRITE: Update flat cena robocizny ---

export async function updateCenaRobocizny(
  pozycjaId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateCenaRobociznySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    cena_robocizny: parsed.data.cena_robocizny,
    cena_robocizny_zrodlo: parsed.data.podwykonawca_id ? 'podwykonawca' : 'reczna',
  };
  if (parsed.data.podwykonawca_id !== undefined) {
    updateData.podwykonawca_id = parsed.data.podwykonawca_id;
  }

  const { error } = await supabase
    .from('kosztorys_pozycje')
    .update(updateData)
    .eq('id', pozycjaId);

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
    is_manual: true,
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
    cena: parsed.data.cena,
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

// --- WRITE: Reset składowa R to library value ---

export async function resetSkladowaR(
  id: string,
  libraryCena: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('kosztorys_skladowe_robocizna')
    .update({ cena: libraryCena })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Reset składowa M to library value ---

export async function resetSkladowaM(
  id: string,
  libraryCena: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('kosztorys_skladowe_materialy')
    .update({ cena: libraryCena, is_manual: false })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- WRITE: Reset all skladowe of a position to library defaults ---

export async function resetPozycjaToLibrary(
  pozycjaId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Fetch pozycja to get pozycja_biblioteka_id
  const { data: pozycja, error: pozycjaError } = await supabase
    .from('kosztorys_pozycje')
    .select('id, pozycja_biblioteka_id')
    .eq('id', pozycjaId)
    .single();

  if (pozycjaError || !pozycja) {
    return { success: false, error: 'Pozycja nie znaleziona' };
  }

  const bibId = pozycja.pozycja_biblioteka_id as string | null;
  if (!bibId) {
    return { success: false, error: 'Pozycja nie ma powiązania z biblioteką' };
  }

  // 2. Determine new cena_robocizny with priority: cheapest subcontractor > library > 0
  let cenaRobocizny = 0;
  let cenaRobociznyZrodlo: 'biblioteka' | 'podwykonawca' | 'reczna' = 'reczna';
  let podwykonawcaId: string | null = null;

  const [stawkiResult, libPozycjaResult] = await Promise.all([
    supabase
      .from('stawki_podwykonawcow')
      .select('podwykonawca_id, stawka')
      .eq('pozycja_biblioteka_id', bibId)
      .eq('aktywny', true)
      .order('stawka', { ascending: true })
      .limit(1),
    supabase
      .from('pozycje_biblioteka')
      .select('cena_robocizny')
      .eq('id', bibId)
      .single(),
  ]);

  if (stawkiResult.data && stawkiResult.data.length > 0) {
    cenaRobocizny = Number((stawkiResult.data[0] as Record<string, unknown>).stawka);
    cenaRobociznyZrodlo = 'podwykonawca';
    podwykonawcaId = (stawkiResult.data[0] as Record<string, unknown>).podwykonawca_id as string;
  } else if (libPozycjaResult.data?.cena_robocizny != null) {
    cenaRobocizny = Number(libPozycjaResult.data.cena_robocizny);
    cenaRobociznyZrodlo = 'biblioteka';
  }

  // 3. Reset cena_robocizny on kosztorys_pozycje
  await supabase
    .from('kosztorys_pozycje')
    .update({
      cena_robocizny: cenaRobocizny,
      cena_robocizny_zrodlowa: cenaRobocizny,
      cena_robocizny_zrodlo: cenaRobociznyZrodlo,
      podwykonawca_id: podwykonawcaId,
    })
    .eq('id', pozycjaId);

  // 4. Reset materialy by lp matching (with price discovery)
  const [libMResult, koszMResult] = await Promise.all([
    supabase
      .from('biblioteka_skladowe_materialy')
      .select('lp, cena_domyslna, norma_domyslna, produkt_id')
      .eq('pozycja_biblioteka_id', bibId)
      .order('lp', { ascending: true }),
    supabase
      .from('kosztorys_skladowe_materialy')
      .select('id, lp')
      .eq('kosztorys_pozycja_id', pozycjaId)
      .order('lp', { ascending: true }),
  ]);

  const libM = (libMResult.data || []) as { lp: number; cena_domyslna: number; norma_domyslna: number; produkt_id: string | null }[];
  const koszM = (koszMResult.data || []) as { id: string; lp: number }[];

  const mUpdates = await Promise.all(
    koszM.map(async (km) => {
      const lib = libM.find((l) => l.lp === km.lp);
      if (!lib) return null;

      let cena = lib.cena_domyslna;

      // 3-tier price discovery for materials
      if (lib.produkt_id) {
        const { data: ceny } = await supabase
          .from('ceny_dostawcow')
          .select('cena_netto')
          .eq('produkt_id', lib.produkt_id)
          .eq('aktywny', true)
          .order('cena_netto', { ascending: true })
          .limit(1);

        if (ceny && ceny.length > 0) {
          cena = Number((ceny[0] as Record<string, unknown>).cena_netto);
        }
      }

      return supabase
        .from('kosztorys_skladowe_materialy')
        .update({
          cena,
          norma: lib.norma_domyslna,
          is_manual: false,
        })
        .eq('id', km.id);
    })
  );

  await Promise.all(mUpdates.filter(Boolean));

  // 5. Reset robocizna by lp matching
  const [libRResult2, koszRResult] = await Promise.all([
    supabase
      .from('biblioteka_skladowe_robocizna')
      .select('lp, cena')
      .eq('pozycja_biblioteka_id', bibId)
      .order('lp', { ascending: true }),
    supabase
      .from('kosztorys_skladowe_robocizna')
      .select('id, lp')
      .eq('kosztorys_pozycja_id', pozycjaId)
      .order('lp', { ascending: true }),
  ]);

  const libR = (libRResult2.data || []) as { lp: number; cena: number }[];
  const koszR = (koszRResult.data || []) as { id: string; lp: number }[];

  const rUpdates = koszR.map((kr) => {
    const lib = libR.find((l) => l.lp === kr.lp);
    if (!lib) return null;

    return supabase
      .from('kosztorys_skladowe_robocizna')
      .update({ cena: lib.cena, cena_zrodlowa: lib.cena })
      .eq('id', kr.id);
  });

  await Promise.all(rUpdates.filter(Boolean));

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

// --- READ: Kategorie for cascading filter dropdowns ---

export interface KategoriaFilter {
  id: string;
  kod: string;
  nazwa: string;
  pelny_kod: string;
}

export async function getKategorieForFilter(
  parentId?: string
): Promise<ActionResult<KategoriaFilter[]>> {
  const supabase = await createClient();

  let query = supabase
    .from('kategorie')
    .select('id, kod, nazwa, pelny_kod')
    .order('kod', { ascending: true });

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.eq('poziom', 1);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data || []) as KategoriaFilter[],
  };
}

// --- WRITE: Bulk update narzut on multiple positions ---

export async function bulkUpdateNarzut(
  pozycjaIds: string[],
  narzutPercent: number
): Promise<ActionResult<{ count: number }>> {
  if (narzutPercent < 0) {
    return { success: false, error: 'Narzut nie może być ujemny' };
  }

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { success: false, error: 'Brak autoryzacji' };
  }

  // Get organization_id for security filtering
  const { data: orgData } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .single();

  if (!orgData) {
    return { success: false, error: 'Brak organizacji' };
  }

  const { error, count } = await supabase
    .from('kosztorys_pozycje')
    .update({ narzut_percent: narzutPercent })
    .in('id', pozycjaIds)
    .eq('organization_id', orgData.organization_id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true, data: { count: count ?? pozycjaIds.length } };
}
