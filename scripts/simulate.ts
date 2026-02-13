/**
 * Simulation script for PLANY App
 *
 * Simulates a full project lifecycle:
 *   1. Create project + revision
 *   2. Add positions from library (with skladowe copy pattern)
 *   3. Set quantities, lock revision, accept
 *   4. Generate umowy + zamówienia drafts
 *   5. Progress through status workflows
 *   6. Register deliveries
 *   7. Add realizacja entries (invoices)
 *
 * Usage:
 *   npm run seed      # first, seed base data
 *   npm run simulate  # then run simulation
 *
 * Prerequisites:
 *   SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars. Add to .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  console.log(`  ${msg}`);
}

function header(msg: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

function section(msg: string) {
  console.log(`\n--- ${msg} ---`);
}

function formatPLN(val: number): string {
  return val.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Phase 1: Project + Kosztorys
// ---------------------------------------------------------------------------

interface PositionToAdd {
  kod: string;
  ilosc: number;
}

const POSITIONS_TO_ADD: PositionToAdd[] = [
  // Prace przygotowawcze
  { kod: 'BUD.01.01.001', ilosc: 180 },   // Rozbiórka ścian GK: 180 m²
  { kod: 'BUD.01.03.001', ilosc: 350 },   // Demontaż sufitu kasetonowego: 350 m²

  // Ścianki GK
  { kod: 'BUD.02.01.001', ilosc: 320 },   // Ścianka GK CW75 pojedyncza: 320 m²
  { kod: 'BUD.02.01.003', ilosc: 85 },    // Ścianka GK CW75 podwójna: 85 m²

  // Sufity
  { kod: 'BUD.05.01.001', ilosc: 450 },   // Sufit kasetonowy mineralny: 450 m²
  { kod: 'BUD.05.02.001', ilosc: 65 },    // Sufit GK na CD60: 65 m²

  // Posadzki
  { kod: 'BUD.04.01.001', ilosc: 480 },   // Wylewka samopoziomująca: 480 m²
  { kod: 'BUD.04.02.001', ilosc: 420 },   // Wykładzina dywanowa: 420 m²
  { kod: 'BUD.04.03.001', ilosc: 60 },    // Gres techniczny: 60 m² (łazienki, kuchnia)

  // Instalacje elektryczne
  { kod: 'ELE.03.01.001', ilosc: 85 },    // Gniazda podwójne: 85 szt
  { kod: 'ELE.02.01.001', ilosc: 120 },   // Oprawy LED: 120 szt
  { kod: 'ELE.01.01.001', ilosc: 95 },    // Korytka kablowe: 95 mb

  // Instalacje sanitarne
  { kod: 'SAN.01.01.001', ilosc: 45 },    // Rura PP-R fi20: 45 mb
  { kod: 'SAN.02.01.001', ilosc: 30 },    // Rura PVC fi50: 30 mb
];

/**
 * Replicate the addPositionFromLibrary copy pattern from kosztorys.ts
 * but using direct supabase client (no Next.js server context needed)
 */
async function addPositionFromLibrary(
  rewizjaId: string,
  pozycjaBibliotekaId: string,
  lp: number
): Promise<string> {
  // 1. Fetch library position
  const { data: libPozycja, error: libError } = await supabase
    .from('pozycje_biblioteka')
    .select('id, nazwa, jednostka, cena_robocizny')
    .eq('id', pozycjaBibliotekaId)
    .single();

  if (libError || !libPozycja) {
    throw new Error(`Library position not found: ${pozycjaBibliotekaId}`);
  }

  // 2. Insert kosztorys position
  const { data: newPozycja, error: insertError } = await supabase
    .from('kosztorys_pozycje')
    .insert({
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pozycjaBibliotekaId,
      organization_id: ORG_ID,
      lp,
      nazwa: libPozycja.nazwa,
      jednostka: libPozycja.jednostka,
      ilosc: 1,
      narzut_percent: 15,
    })
    .select('id')
    .single();

  if (insertError || !newPozycja) {
    throw new Error(`Failed to insert position: ${insertError?.message}`);
  }

  const pozycjaId = newPozycja.id;

  // 3. Set flat cena_robocizny (priority: cheapest subcontractor > library > 0)
  const { data: stawki } = await supabase
    .from('stawki_podwykonawcow')
    .select('podwykonawca_id, stawka')
    .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
    .eq('aktywny', true)
    .order('stawka', { ascending: true });

  let cenaRobocizny = libPozycja.cena_robocizny ?? 0;
  let cenaZrodlo = cenaRobocizny > 0 ? 'biblioteka' : 'reczna';
  let podwykonawcaId: string | null = null;

  if (stawki && stawki.length > 0) {
    cenaRobocizny = Number(stawki[0].stawka);
    cenaZrodlo = 'podwykonawca';
    podwykonawcaId = stawki[0].podwykonawca_id;
  }

  await supabase.from('kosztorys_pozycje').update({
    cena_robocizny: cenaRobocizny,
    cena_robocizny_zrodlowa: cenaRobocizny,
    cena_robocizny_zrodlo: cenaZrodlo,
    podwykonawca_id: podwykonawcaId,
  }).eq('id', pozycjaId);

  // 4. Copy składowe materiały
  const { data: libMaterialy } = await supabase
    .from('biblioteka_skladowe_materialy')
    .select('lp, nazwa, norma_domyslna, cena_domyslna, jednostka, produkt_id, dostawca_id')
    .eq('pozycja_biblioteka_id', pozycjaBibliotekaId)
    .order('lp');

  if (libMaterialy && libMaterialy.length > 0) {
    const materialyInserts = await Promise.all(
      libMaterialy.map(async (m) => {
        let cena = Number(m.cena_domyslna ?? 0);
        let dostawcaId: string | null = m.dostawca_id;

        // Find cheapest supplier price
        if (m.produkt_id) {
          const { data: ceny } = await supabase
            .from('ceny_dostawcow')
            .select('dostawca_id, cena_netto')
            .eq('produkt_id', m.produkt_id)
            .eq('aktywny', true)
            .order('cena_netto', { ascending: true })
            .limit(1);

          if (ceny && ceny.length > 0) {
            cena = Number(ceny[0].cena_netto);
            dostawcaId = ceny[0].dostawca_id;
          }
        }

        return {
          kosztorys_pozycja_id: pozycjaId,
          lp: Number(m.lp),
          nazwa: m.nazwa,
          norma: Number(m.norma_domyslna ?? 1),
          jednostka: m.jednostka,
          cena,
          produkt_id: m.produkt_id,
          dostawca_id: dostawcaId,
        };
      })
    );

    await supabase.from('kosztorys_skladowe_materialy').insert(materialyInserts);
  }

  return pozycjaId;
}

async function phase1_ProjektKosztorys(): Promise<{
  projektId: string;
  rewizjaId: string;
  pozycjeIds: string[];
}> {
  header('PHASE 1: Project + Kosztorys');

  // --- Create project ---
  section('Creating project');
  const { data: projekt, error: pError } = await supabase
    .from('projekty')
    .insert({
      nazwa: 'Biuro IT Solutions sp. z o.o. - ul. Marszałkowska 100',
      slug: 'biuro-it-solutions-marszalkowska-100',
      klient: 'IT Solutions sp. z o.o.',
      adres: 'ul. Marszałkowska 100, 00-026 Warszawa',
      powierzchnia: 500,
      status: 'draft',
      organization_id: ORG_ID,
    })
    .select('id, slug')
    .single();

  if (pError) throw new Error(`Project creation failed: ${pError.message}`);
  log(`✓ Project: ${projekt!.slug} (${projekt!.id})`);

  // --- Create revision R1 ---
  section('Creating revision R1');
  const { data: rewizja, error: rError } = await supabase
    .from('rewizje')
    .insert({
      projekt_id: projekt!.id,
      numer: 1,
      nazwa: 'R1 — Wycena podstawowa',
    })
    .select('id, numer')
    .single();

  if (rError) throw new Error(`Revision creation failed: ${rError.message}`);
  log(`✓ Revision R${rewizja!.numer} (${rewizja!.id})`);

  // --- Add positions from library ---
  section('Adding positions from library');
  const pozycjeIds: string[] = [];

  for (let i = 0; i < POSITIONS_TO_ADD.length; i++) {
    const pos = POSITIONS_TO_ADD[i];

    // Find library position by kod
    const { data: libPos } = await supabase
      .from('pozycje_biblioteka')
      .select('id, kod, nazwa')
      .eq('kod', pos.kod)
      .eq('organization_id', ORG_ID)
      .single();

    if (!libPos) {
      log(`⚠ Position ${pos.kod} not found in library, skipping`);
      continue;
    }

    const pozycjaId = await addPositionFromLibrary(rewizja!.id, libPos.id, i + 1);
    pozycjeIds.push(pozycjaId);

    // Update quantity
    await supabase
      .from('kosztorys_pozycje')
      .update({ ilosc: pos.ilosc })
      .eq('id', pozycjaId);

    log(`✓ [${i + 1}/${POSITIONS_TO_ADD.length}] ${pos.kod} — ${libPos.nazwa} × ${pos.ilosc}`);
  }

  // --- View totals from view ---
  section('Kosztorys summary');
  const { data: viewData } = await supabase
    .from('kosztorys_pozycje_view')
    .select('nazwa, ilosc, m_materialy, r_robocizna, narzut_wartosc, razem')
    .eq('rewizja_id', rewizja!.id)
    .order('lp');

  let totalM = 0, totalR = 0, totalNarzut = 0, totalRazem = 0;
  for (const v of viewData || []) {
    totalM += Number(v.m_materialy ?? 0);
    totalR += Number(v.r_robocizna ?? 0);
    totalNarzut += Number(v.narzut_wartosc ?? 0);
    totalRazem += Number(v.razem ?? 0);
  }

  log(`Positions:   ${viewData?.length || 0}`);
  log(`Materiały:   ${formatPLN(totalM)}`);
  log(`Robocizna:   ${formatPLN(totalR)}`);
  log(`Narzut:      ${formatPLN(totalNarzut)}`);
  log(`RAZEM:       ${formatPLN(totalRazem)}`);

  // --- Lock revision ---
  section('Locking revision');
  await supabase
    .from('rewizje')
    .update({ is_locked: true, locked_at: new Date().toISOString() })
    .eq('id', rewizja!.id);
  log('✓ Revision R1 locked');

  // --- Transition: draft → ofertowanie ---
  section('Sending to client (draft → ofertowanie)');
  const { error: statusError1 } = await supabase.rpc('change_project_status', {
    p_projekt_id: projekt!.id,
    p_new_status: 'ofertowanie',
  });
  if (statusError1) throw new Error(`Status change failed: ${statusError1.message}`);
  log('✓ Status: ofertowanie');

  // --- Accept revision (ofertowanie → realizacja) ---
  section('Client accepts (ofertowanie → realizacja)');
  const { error: statusError2 } = await supabase.rpc('change_project_status', {
    p_projekt_id: projekt!.id,
    p_new_status: 'realizacja',
    p_rewizja_id: rewizja!.id,
  });
  if (statusError2) throw new Error(`Accept failed: ${statusError2.message}`);
  log('✓ Status: realizacja (revision accepted)');

  return {
    projektId: projekt!.id,
    rewizjaId: rewizja!.id,
    pozycjeIds,
  };
}

// ---------------------------------------------------------------------------
// Phase 2: Umowy + Zamówienia
// ---------------------------------------------------------------------------

async function phase2_UmowyZamowienia(projektId: string, rewizjaId: string) {
  header('PHASE 2: Umowy (Contracts) + Zamówienia (Purchase Orders)');

  // --- Generate umowy draft ---
  section('Generating contract drafts (generate_umowy_draft)');
  const { data: umowyCount, error: uError } = await supabase.rpc('generate_umowy_draft', {
    p_projekt_id: projektId,
    p_rewizja_id: rewizjaId,
  });
  if (uError) log(`⚠ generate_umowy_draft: ${uError.message}`);
  else log(`✓ Generated ${umowyCount} contract drafts`);

  // --- Generate zamówienia draft ---
  section('Generating purchase order drafts (generate_zamowienia_draft)');
  const { data: zamCount, error: zError } = await supabase.rpc('generate_zamowienia_draft', {
    p_projekt_id: projektId,
    p_rewizja_id: rewizjaId,
  });
  if (zError) log(`⚠ generate_zamowienia_draft: ${zError.message}`);
  else log(`✓ Generated ${zamCount} purchase order drafts`);

  // Give DB a moment to settle
  await sleep(500);

  // --- Process umowy: draft → wyslana → podpisana ---
  section('Processing contracts');
  const { data: umowy } = await supabase
    .from('umowy')
    .select('id, numer, status, podwykonawcy(nazwa)')
    .eq('projekt_id', projektId)
    .order('numer');

  for (const u of umowy || []) {
    const podNazwa = (u.podwykonawcy as unknown as { nazwa: string } | null)?.nazwa || '—';

    // draft → wyslana
    await supabase
      .from('umowy')
      .update({ status: 'wyslana', updated_at: new Date().toISOString() })
      .eq('id', u.id);

    // wyslana → podpisana
    await supabase
      .from('umowy')
      .update({
        status: 'podpisana',
        data_podpisania: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', u.id);

    log(`✓ Umowa ${u.numer} (${podNazwa}): draft → wyslana → podpisana`);
  }

  // --- Process zamówienia: draft → wyslane ---
  section('Processing purchase orders');
  const { data: zamowienia } = await supabase
    .from('zamowienia')
    .select('id, numer, status, dostawcy(nazwa)')
    .eq('projekt_id', projektId)
    .order('numer');

  for (const z of zamowienia || []) {
    const dosNazwa = (z.dostawcy as unknown as { nazwa: string } | null)?.nazwa || '—';

    // draft → wyslane
    await supabase
      .from('zamowienia')
      .update({
        status: 'wyslane',
        data_zamowienia: new Date().toISOString().slice(0, 10),
        data_dostawy_planowana: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', z.id);

    log(`✓ Zamówienie ${z.numer} (${dosNazwa}): draft → wyslane`);
  }

  // --- Register deliveries ---
  section('Registering deliveries');
  // Refresh zamowienia to get updated status
  const { data: activeZamowienia } = await supabase
    .from('zamowienia')
    .select('id, numer')
    .eq('projekt_id', projektId)
    .order('numer');

  for (const z of activeZamowienia || []) {
    // Get pozycje for this zamówienie
    const { data: pozycje } = await supabase
      .from('zamowienie_pozycje')
      .select('id, nazwa, ilosc_zamowiona')
      .eq('zamowienie_id', z.id);

    if (!pozycje || pozycje.length === 0) continue;

    // Partial delivery (70%)
    const { data: dostawa1 } = await supabase
      .from('zamowienie_dostawy')
      .insert({
        zamowienie_id: z.id,
        data_dostawy: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        numer_wz: `WZ/${z.numer}/1`,
        uwagi: 'Dostawa częściowa',
      })
      .select('id')
      .single();

    if (dostawa1) {
      const dostawaItems = pozycje.map((p) => ({
        zamowienie_dostawa_id: dostawa1.id,
        zamowienie_pozycja_id: p.id,
        ilosc_dostarczona: Math.round(Number(p.ilosc_zamowiona) * 0.7),
      }));

      await supabase.from('zamowienie_dostawy_pozycje').insert(dostawaItems);

      // Update ilosc_dostarczona on zamowienie_pozycje
      for (const item of dostawaItems) {
        await supabase
          .from('zamowienie_pozycje')
          .update({ ilosc_dostarczona: item.ilosc_dostarczona })
          .eq('id', item.zamowienie_pozycja_id);
      }
    }

    // Update status: wyslane → czesciowo
    await supabase
      .from('zamowienia')
      .update({ status: 'czesciowo', updated_at: new Date().toISOString() })
      .eq('id', z.id);

    // Full delivery (remaining 30%)
    const { data: dostawa2 } = await supabase
      .from('zamowienie_dostawy')
      .insert({
        zamowienie_id: z.id,
        data_dostawy: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        numer_wz: `WZ/${z.numer}/2`,
        uwagi: 'Dostawa uzupełniająca',
      })
      .select('id')
      .single();

    if (dostawa2) {
      const remaining = pozycje.map((p) => {
        const total = Math.round(Number(p.ilosc_zamowiona));
        const delivered = Math.round(total * 0.7);
        return {
          zamowienie_dostawa_id: dostawa2.id,
          zamowienie_pozycja_id: p.id,
          ilosc_dostarczona: total - delivered,
        };
      });

      await supabase.from('zamowienie_dostawy_pozycje').insert(remaining);

      // Update total delivered
      for (const item of remaining) {
        const { data: current } = await supabase
          .from('zamowienie_pozycje')
          .select('ilosc_dostarczona')
          .eq('id', item.zamowienie_pozycja_id)
          .single();

        const newTotal = Number(current?.ilosc_dostarczona ?? 0) + item.ilosc_dostarczona;
        await supabase
          .from('zamowienie_pozycje')
          .update({ ilosc_dostarczona: newTotal })
          .eq('id', item.zamowienie_pozycja_id);
      }
    }

    // czesciowo → dostarczone
    await supabase
      .from('zamowienia')
      .update({ status: 'dostarczone', updated_at: new Date().toISOString() })
      .eq('id', z.id);

    log(`✓ Zamówienie ${z.numer}: 2 deliveries registered → dostarczone`);
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Realizacja (Execution tracking)
// ---------------------------------------------------------------------------

async function phase3_Realizacja(projektId: string) {
  header('PHASE 3: Realizacja (Invoices & Tracking)');

  // Get zamówienia for linking
  const { data: zamowienia } = await supabase
    .from('zamowienia')
    .select('id, numer, dostawcy(nazwa)')
    .eq('projekt_id', projektId)
    .order('numer');

  // Get umowy for linking
  const { data: umowy } = await supabase
    .from('umowy')
    .select('id, numer, podwykonawcy(nazwa)')
    .eq('projekt_id', projektId)
    .order('numer');

  section('Adding material invoices');

  // Material invoices — linked to zamówienia
  const materialInvoices = (zamowienia || []).map((z, i) => {
    const dosNazwa = (z.dostawcy as unknown as { nazwa: string } | null)?.nazwa || 'Dostawca';
    const kwota = 5000 + Math.round(Math.random() * 20000);
    return {
      organization_id: ORG_ID,
      projekt_id: projektId,
      typ: 'material' as const,
      kwota_netto: kwota,
      numer_faktury: `FV/MAT/${2026}/${String(i + 1).padStart(3, '0')}`,
      data_faktury: new Date(Date.now() + (i + 1) * 3 * 86400000).toISOString().slice(0, 10),
      opis: `Faktura materiałowa — ${dosNazwa}`,
      zamowienie_id: z.id,
      umowa_id: null,
      oplacone: i < 2, // first 2 paid
    };
  });

  for (const inv of materialInvoices) {
    const { error } = await supabase.from('realizacja_wpisy').insert(inv);
    if (error) log(`⚠ Invoice: ${error.message}`);
    else log(`✓ ${inv.numer_faktury} — ${formatPLN(inv.kwota_netto)} ${inv.oplacone ? '(opłacone)' : ''}`);
  }

  section('Adding labor invoices');

  // Labor invoices — linked to umowy
  const laborInvoices = (umowy || []).map((u, i) => {
    const podNazwa = (u.podwykonawcy as unknown as { nazwa: string } | null)?.nazwa || 'Podwykonawca';
    const kwota = 8000 + Math.round(Math.random() * 15000);
    return {
      organization_id: ORG_ID,
      projekt_id: projektId,
      typ: 'robocizna' as const,
      kwota_netto: kwota,
      numer_faktury: `FV/ROB/${2026}/${String(i + 1).padStart(3, '0')}`,
      data_faktury: new Date(Date.now() + (i + 2) * 5 * 86400000).toISOString().slice(0, 10),
      opis: `Faktura robocizna — ${podNazwa}`,
      zamowienie_id: null,
      umowa_id: u.id,
      oplacone: i === 0, // first one paid
    };
  });

  for (const inv of laborInvoices) {
    const { error } = await supabase.from('realizacja_wpisy').insert(inv);
    if (error) log(`⚠ Invoice: ${error.message}`);
    else log(`✓ ${inv.numer_faktury} — ${formatPLN(inv.kwota_netto)} ${inv.oplacone ? '(opłacone)' : ''}`);
  }

  // Add a few "other" costs
  section('Adding other costs');
  const otherCosts = [
    { opis: 'Transport materiałów — dostawa na budowę', kwota_netto: 2800, numer: 'FV/INNE/2026/001' },
    { opis: 'Kontener na odpady budowlane', kwota_netto: 1500, numer: 'FV/INNE/2026/002' },
    { opis: 'Ochrona budowy — miesiąc 1', kwota_netto: 3200, numer: 'FV/INNE/2026/003' },
  ];

  for (const c of otherCosts) {
    await supabase.from('realizacja_wpisy').insert({
      organization_id: ORG_ID,
      projekt_id: projektId,
      typ: 'inny',
      kwota_netto: c.kwota_netto,
      numer_faktury: c.numer,
      data_faktury: new Date().toISOString().slice(0, 10),
      opis: c.opis,
      oplacone: false,
    });
    log(`✓ ${c.numer} — ${formatPLN(c.kwota_netto)}`);
  }

  // --- Add execution records for umowy ---
  section('Adding contract execution records');
  for (const u of umowy || []) {
    const { data: pozycje } = await supabase
      .from('umowa_pozycje')
      .select('id, nazwa, ilosc')
      .eq('umowa_id', u.id);

    for (const p of pozycje || []) {
      // Report ~60% execution
      const executed = Math.round(Number(p.ilosc) * 0.6);
      if (executed > 0) {
        await supabase.from('umowa_wykonanie').insert({
          umowa_pozycja_id: p.id,
          data_wpisu: new Date().toISOString().slice(0, 10),
          ilosc_wykonana: executed,
          uwagi: 'Raport częściowy',
        });

        // Update ilosc_wykonana and procent_wykonania
        const procent = Math.round((executed / Number(p.ilosc)) * 100);
        await supabase
          .from('umowa_pozycje')
          .update({
            ilosc_wykonana: executed,
            procent_wykonania: procent,
          })
          .eq('id', p.id);
      }
    }

    const podNazwa = (u.podwykonawcy as unknown as { nazwa: string } | null)?.nazwa || '—';
    log(`✓ Umowa ${u.numer} (${podNazwa}): execution ~60% reported`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

async function printSummary(projektId: string) {
  header('SUMMARY');

  // Get project info
  const { data: projekt } = await supabase
    .from('projekty')
    .select('nazwa, status, powierzchnia')
    .eq('id', projektId)
    .single();

  log(`Project:     ${projekt?.nazwa}`);
  log(`Status:      ${projekt?.status}`);
  log(`Area:        ${projekt?.powierzchnia} m²`);

  // Get revision summary
  const { data: rewizje } = await supabase
    .from('rewizje_summary')
    .select('*')
    .eq('projekt_id', projektId);

  if (rewizje && rewizje.length > 0) {
    const r = rewizje[0];
    section('Budget (from accepted revision)');
    log(`Positions:   ${r.liczba_pozycji}`);
    log(`Materiały:   ${formatPLN(Number(r.suma_m ?? 0))}`);
    log(`Robocizna:   ${formatPLN(Number(r.suma_r ?? 0))}`);
    log(`TOTAL:       ${formatPLN(Number(r.suma_razem ?? 0))}`);
  }

  // Count contracts and orders
  const { count: umowyCount } = await supabase
    .from('umowy')
    .select('id', { count: 'exact', head: true })
    .eq('projekt_id', projektId);

  const { count: zamowieniaCount } = await supabase
    .from('zamowienia')
    .select('id', { count: 'exact', head: true })
    .eq('projekt_id', projektId);

  section('Contracts & Orders');
  log(`Umowy:       ${umowyCount} contracts`);
  log(`Zamówienia:  ${zamowieniaCount} purchase orders`);

  // Realizacja costs
  const { data: wpisy } = await supabase
    .from('realizacja_wpisy')
    .select('typ, kwota_netto, oplacone')
    .eq('projekt_id', projektId);

  let costM = 0, costR = 0, costO = 0, paid = 0;
  for (const w of wpisy || []) {
    const kwota = Number(w.kwota_netto);
    if (w.typ === 'material') costM += kwota;
    else if (w.typ === 'robocizna') costR += kwota;
    else costO += kwota;
    if (w.oplacone) paid += kwota;
  }

  section('Actual Costs (realizacja)');
  log(`Materiały:   ${formatPLN(costM)}`);
  log(`Robocizna:   ${formatPLN(costR)}`);
  log(`Inne:        ${formatPLN(costO)}`);
  log(`TOTAL:       ${formatPLN(costM + costR + costO)}`);
  log(`Opłacone:    ${formatPLN(paid)}`);
  log(`Do zapłaty:  ${formatPLN(costM + costR + costO - paid)}`);

  if (rewizje && rewizje.length > 0) {
    const budget = Number(rewizje[0].suma_razem ?? 0);
    const actual = costM + costR + costO;
    const diff = budget - actual;
    section('Budget vs Actual');
    log(`Budget:      ${formatPLN(budget)}`);
    log(`Actual:      ${formatPLN(actual)}`);
    log(`Difference:  ${formatPLN(diff)} ${diff >= 0 ? '(under budget)' : '(OVER BUDGET!)'}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Open in browser: http://localhost:3000/projekty`);
  console.log(`  Project detail:  http://localhost:3000/projekty/${projektId}/kosztorys`);
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀 PLANY App — Simulation Script');
  console.log(`   URL: ${SUPABASE_URL}`);

  const { projektId, rewizjaId } = await phase1_ProjektKosztorys();
  await phase2_UmowyZamowienia(projektId, rewizjaId);
  await phase3_Realizacja(projektId);
  await printSummary(projektId);

  console.log('\n✅ Simulation complete!');
}

main().catch((err) => {
  console.error('❌ Simulation failed:', err);
  process.exit(1);
});
