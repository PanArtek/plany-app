import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase env vars.\n' +
      'Ensure .env.local contains:\n' +
      '  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n' +
      'Get the service_role key from: Supabase Dashboard → Settings → API → service_role key'
  );
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function cleanupOrganization(orgId: string) {
  await supabase.from('organizations').delete().eq('id', orgId);
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Organization ---

export async function createTestOrganization(suffix?: string) {
  const tag = suffix || uid();
  const { data, error } = await supabase
    .from('organizations')
    .insert({ nazwa: `Test Org ${tag}`, slug: `test-${uid()}` })
    .select()
    .single();
  if (error) throw new Error(`createTestOrganization: ${error.message}`);
  return data;
}

// --- Kategorie ---

export async function createKategoria(
  orgId: string,
  opts: { kod: string; nazwa: string; parent_id?: string; poziom?: number }
) {
  const { data, error } = await supabase
    .from('kategorie')
    .insert({
      organization_id: orgId,
      kod: opts.kod,
      nazwa: opts.nazwa,
      parent_id: opts.parent_id || null,
      poziom: opts.poziom ?? 1,
    })
    .select()
    .single();
  if (error) throw new Error(`createKategoria: ${error.message}`);
  return data;
}

export async function createKategoriaHierarchy(
  orgId: string,
  branza: { kod: string; nazwa: string },
  kat: { kod: string; nazwa: string },
  podkat: { kod: string; nazwa: string }
) {
  const branzaRec = await createKategoria(orgId, {
    kod: branza.kod,
    nazwa: branza.nazwa,
    poziom: 1,
  });
  const katRec = await createKategoria(orgId, {
    kod: kat.kod,
    nazwa: kat.nazwa,
    parent_id: branzaRec.id,
    poziom: 2,
  });
  const podkatRec = await createKategoria(orgId, {
    kod: podkat.kod,
    nazwa: podkat.nazwa,
    parent_id: katRec.id,
    poziom: 3,
  });
  return { branza: branzaRec, kategoria: katRec, podkategoria: podkatRec };
}

// --- Pozycja biblioteczna ---

export async function createPozycjaBiblioteka(
  orgId: string,
  opts: {
    kategoria_id: string;
    kod: string;
    nazwa: string;
    jednostka: string;
    typ?: string;
  }
) {
  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .insert({
      organization_id: orgId,
      kategoria_id: opts.kategoria_id,
      kod: opts.kod,
      nazwa: opts.nazwa,
      jednostka: opts.jednostka,
      typ: opts.typ || 'material',
    })
    .select()
    .single();
  if (error) throw new Error(`createPozycjaBiblioteka: ${error.message}`);
  return data;
}

// --- Dostawca ---

export async function createDostawca(
  orgId: string,
  opts: { nazwa: string; kod: string }
) {
  const { data, error } = await supabase
    .from('dostawcy')
    .insert({
      organization_id: orgId,
      nazwa: opts.nazwa,
      kod: opts.kod,
    })
    .select()
    .single();
  if (error) throw new Error(`createDostawca: ${error.message}`);
  return data;
}

// --- Produkt ---

export async function createProdukt(
  orgId: string,
  opts: { sku: string; nazwa: string; jednostka?: string; kategoria?: string }
) {
  const { data, error } = await supabase
    .from('produkty')
    .insert({
      organization_id: orgId,
      sku: opts.sku,
      nazwa: opts.nazwa,
      jednostka: opts.jednostka || 'szt',
      kategoria: opts.kategoria || null,
    })
    .select()
    .single();
  if (error) throw new Error(`createProdukt: ${error.message}`);
  return data;
}

// --- Cena dostawcy ---

export async function createCenaDostawcy(opts: {
  dostawca_id: string;
  produkt_id: string;
  cena_netto: number;
}) {
  const { data, error } = await supabase
    .from('ceny_dostawcow')
    .insert({
      dostawca_id: opts.dostawca_id,
      produkt_id: opts.produkt_id,
      cena_netto: opts.cena_netto,
    })
    .select()
    .single();
  if (error) throw new Error(`createCenaDostawcy: ${error.message}`);
  return data;
}

// --- Podwykonawca ---

export async function createPodwykonawca(
  orgId: string,
  opts: { nazwa: string; specjalizacja?: string }
) {
  const { data, error } = await supabase
    .from('podwykonawcy')
    .insert({
      organization_id: orgId,
      nazwa: opts.nazwa,
      specjalizacja: opts.specjalizacja || null,
    })
    .select()
    .single();
  if (error) throw new Error(`createPodwykonawca: ${error.message}`);
  return data;
}

// --- Typ robocizny ---

export async function createTypRobocizny(
  orgId: string,
  opts: { nazwa: string; jednostka?: string; opis?: string }
) {
  const { data, error } = await supabase
    .from('typy_robocizny')
    .insert({
      organization_id: orgId,
      nazwa: opts.nazwa,
      jednostka: opts.jednostka || 'm2',
      opis: opts.opis || null,
    })
    .select()
    .single();
  if (error) throw new Error(`createTypRobocizny: ${error.message}`);
  return data;
}

// --- Stawka podwykonawcy ---

export async function createStawkaPodwykonawcy(opts: {
  podwykonawca_id: string;
  typ_robocizny_id: string;
  stawka: number;
}) {
  const { data, error } = await supabase
    .from('stawki_podwykonawcow')
    .insert({
      podwykonawca_id: opts.podwykonawca_id,
      typ_robocizny_id: opts.typ_robocizny_id,
      stawka: opts.stawka,
    })
    .select()
    .single();
  if (error) throw new Error(`createStawkaPodwykonawcy: ${error.message}`);
  return data;
}

// --- Biblioteka składowe materiały ---

export async function createBibliotekaSkladowaM(opts: {
  pozycja_biblioteka_id: string;
  lp: number;
  produkt_id: string;
  dostawca_id: string;
  norma_domyslna?: number;
  jednostka?: string;
}) {
  const { data, error } = await supabase
    .from('biblioteka_skladowe_materialy')
    .insert({
      pozycja_biblioteka_id: opts.pozycja_biblioteka_id,
      lp: opts.lp,
      produkt_id: opts.produkt_id,
      dostawca_id: opts.dostawca_id,
      norma_domyslna: opts.norma_domyslna ?? 1,
      jednostka: opts.jednostka || null,
    })
    .select()
    .single();
  if (error) throw new Error(`createBibliotekaSkladowaM: ${error.message}`);
  return data;
}

// --- Biblioteka składowe robocizna ---

export async function createBibliotekaSkladowaR(opts: {
  pozycja_biblioteka_id: string;
  lp: number;
  typ_robocizny_id: string;
  podwykonawca_id: string;
  cena?: number;
}) {
  const { data, error } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .insert({
      pozycja_biblioteka_id: opts.pozycja_biblioteka_id,
      lp: opts.lp,
      typ_robocizny_id: opts.typ_robocizny_id,
      podwykonawca_id: opts.podwykonawca_id,
      cena: opts.cena ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(`createBibliotekaSkladowaR: ${error.message}`);
  return data;
}

// --- Projekt ---

export async function createProjekt(
  orgId: string,
  opts: { nazwa: string; slug?: string; powierzchnia?: number }
) {
  const { data, error } = await supabase
    .from('projekty')
    .insert({
      organization_id: orgId,
      nazwa: opts.nazwa,
      slug: opts.slug || `proj-${uid()}`,
      powierzchnia: opts.powierzchnia ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createProjekt: ${error.message}`);
  return data;
}

// --- Rewizja ---

export async function createRewizja(opts: {
  projekt_id: string;
  nazwa?: string;
}) {
  const { data, error } = await supabase
    .from('rewizje')
    .insert({
      projekt_id: opts.projekt_id,
      nazwa: opts.nazwa || null,
    })
    .select()
    .single();
  if (error) throw new Error(`createRewizja: ${error.message}`);
  return data;
}

// --- Kosztorys pozycja ---

export async function createKosztorysPozycja(
  orgId: string,
  opts: {
    rewizja_id: string;
    pozycja_biblioteka_id?: string;
    lp: number;
    nazwa: string;
    ilosc: number;
    jednostka: string;
    narzut_percent?: number;
  }
) {
  const { data, error } = await supabase
    .from('kosztorys_pozycje')
    .insert({
      organization_id: orgId,
      rewizja_id: opts.rewizja_id,
      pozycja_biblioteka_id: opts.pozycja_biblioteka_id || null,
      lp: opts.lp,
      nazwa: opts.nazwa,
      ilosc: opts.ilosc,
      jednostka: opts.jednostka,
      narzut_percent: opts.narzut_percent ?? 30,
    })
    .select()
    .single();
  if (error) throw new Error(`createKosztorysPozycja: ${error.message}`);
  return data;
}

// --- Kosztorys składowe robocizna ---

export async function createKosztorysSkladowaR(opts: {
  kosztorys_pozycja_id: string;
  lp: number;
  typ_robocizny_id: string;
  podwykonawca_id: string;
  cena: number;
}) {
  const { data, error } = await supabase
    .from('kosztorys_skladowe_robocizna')
    .insert({
      kosztorys_pozycja_id: opts.kosztorys_pozycja_id,
      lp: opts.lp,
      typ_robocizny_id: opts.typ_robocizny_id,
      podwykonawca_id: opts.podwykonawca_id,
      cena: opts.cena,
    })
    .select()
    .single();
  if (error) throw new Error(`createKosztorysSkladowaR: ${error.message}`);
  return data;
}

// --- Kosztorys składowe materiały ---

export async function createKosztorysSkladowaM(opts: {
  kosztorys_pozycja_id: string;
  lp: number;
  produkt_id: string;
  dostawca_id: string;
  cena: number;
  norma: number;
  is_manual?: boolean;
  ilosc?: number;
  jednostka?: string;
}) {
  const record: Record<string, unknown> = {
    kosztorys_pozycja_id: opts.kosztorys_pozycja_id,
    lp: opts.lp,
    produkt_id: opts.produkt_id,
    dostawca_id: opts.dostawca_id,
    cena: opts.cena,
    norma: opts.norma,
    is_manual: opts.is_manual ?? false,
    jednostka: opts.jednostka || null,
  };
  if (opts.ilosc !== undefined) record.ilosc = opts.ilosc;
  const { data, error } = await supabase
    .from('kosztorys_skladowe_materialy')
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(`createKosztorysSkladowaM: ${error.message}`);
  return data;
}
