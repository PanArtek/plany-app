/**
 * Seed script for PLANY App
 *
 * Seeds realistic data for a fit-out construction company:
 * - Additional products (construction materials)
 * - Additional suppliers with prices
 * - Additional subcontractors with rates
 * - Library position components (biblioteka_skladowe_materialy + robocizna)
 *   This is the CRITICAL missing piece - without these, kosztorys has no cost breakdown.
 *
 * Usage:
 *   npm run seed
 *
 * Prerequisites:
 *   Add SUPABASE_SERVICE_ROLE_KEY to .env.local
 *   (Dashboard → Settings → API → service_role key)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = '00000000-0000-0000-0000-000000000001'; // Demo Organization

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars. Add to .env.local:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=...');
  console.error('   (Dashboard → Settings → API → service_role key)');
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
  console.log(`\n🔧 ${msg}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertOne(
  table: string,
  data: Record<string, unknown>,
  onConflict: string
): Promise<Record<string, unknown> & { id: string }> {
  const { data: row, error } = await supabase
    .from(table)
    .upsert(data, { onConflict })
    .select('*')
    .single();
  if (error) throw new Error(`upsert ${table}: ${error.message}`);
  return row as Record<string, unknown> & { id: string };
}

async function getIdByField(
  table: string,
  field: string,
  value: string
): Promise<string | null> {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq(field, value)
    .eq('organization_id', ORG_ID)
    .limit(1)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

// ---------------------------------------------------------------------------
// 1. Cleanup simulation artifacts (not base data)
// ---------------------------------------------------------------------------

async function cleanup() {
  header('Cleaning up old simulation data...');

  // Delete in FK-safe order
  const tables = [
    'realizacja_wpisy',
    'zamowienie_dostawy_pozycje',
    'zamowienie_dostawy',
    'zamowienie_pozycje_zrodla',
    'zamowienie_pozycje',
    'zamowienia',
    'umowa_wykonanie',
    'umowa_pozycje_zrodla',
    'umowa_pozycje',
    'umowy',
    'kosztorys_skladowe_robocizna',
    'kosztorys_skladowe_materialy',
    'kosztorys_pozycje',
    'rewizje',
    'projekty',
    'biblioteka_skladowe_robocizna',
    'biblioteka_skladowe_materialy',
    'stawki_podwykonawcow',
    'ceny_dostawcow',
  ];

  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) log(`  ⚠ ${t}: ${error.message}`);
    else log(`  ✓ ${t}`);
  }

  log('Cleanup done');
}

// ---------------------------------------------------------------------------
// 2. Products (materiały budowlane)
// ---------------------------------------------------------------------------

interface ProduktSeed {
  sku: string;
  nazwa: string;
  jednostka: string;
  kategoria?: string;
}

const PRODUKTY: ProduktSeed[] = [
  // GK (gipskarton)
  { sku: 'GK-CW50', nazwa: 'Profil CW 50', jednostka: 'mb' },
  { sku: 'GK-CW75', nazwa: 'Profil CW 75', jednostka: 'mb' },
  { sku: 'GK-CW100', nazwa: 'Profil CW 100', jednostka: 'mb' },
  { sku: 'GK-UW50', nazwa: 'Profil UW 50', jednostka: 'mb' },
  { sku: 'GK-UW75', nazwa: 'Profil UW 75', jednostka: 'mb' },
  { sku: 'GK-UW100', nazwa: 'Profil UW 100', jednostka: 'mb' },
  { sku: 'GK-CD60', nazwa: 'Profil CD 60x27', jednostka: 'mb' },
  { sku: 'GK-UD28', nazwa: 'Profil UD 28', jednostka: 'mb' },
  { sku: 'GK-PLYTA-125', nazwa: 'Płyta GK 12.5mm 1200x2600', jednostka: 'm²' },
  { sku: 'GK-PLYTA-125-H2', nazwa: 'Płyta GK 12.5mm wodoodporna H2', jednostka: 'm²' },
  { sku: 'GK-WKRETY-KPL', nazwa: 'Wkręty do GK 3.5x35 (op.1000)', jednostka: 'op' },
  { sku: 'GK-TASMA-PAPIER', nazwa: 'Taśma papierowa do spoin 75m', jednostka: 'mb' },
  { sku: 'GK-MASA-SZPACHL', nazwa: 'Masa szpachlowa Knauf Uniflott 25kg', jednostka: 'kg' },
  { sku: 'GK-WELNA-50', nazwa: 'Wełna mineralna 50mm do ścianek', jednostka: 'm²' },
  { sku: 'GK-WELNA-100', nazwa: 'Wełna mineralna 100mm akustyczna', jednostka: 'm²' },
  { sku: 'GK-WIESZAK-ES', nazwa: 'Wieszak ES do profili CD', jednostka: 'szt' },
  { sku: 'GK-LACZNIK-CD', nazwa: 'Łącznik krzyżowy do CD60', jednostka: 'szt' },

  // Sufity
  { sku: 'SUF-KASETON-60', nazwa: 'Kaseton mineralny Armstrong 60x60', jednostka: 'szt' },
  { sku: 'SUF-RUSZT-T24', nazwa: 'Ruszt sufitowy T24 główny 3600mm', jednostka: 'mb' },
  { sku: 'SUF-RUSZT-T24P', nazwa: 'Ruszt sufitowy T24 poprzeczny 600mm', jednostka: 'szt' },
  { sku: 'SUF-ZAWIESZKA', nazwa: 'Zawieszka sufitowa z dyblem', jednostka: 'szt' },

  // Posadzki
  { sku: 'POD-WYLEWKA-25', nazwa: 'Wylewka samopoziomująca 25kg (3-5mm)', jednostka: 'kg' },
  { sku: 'POD-GRUNT', nazwa: 'Grunt pod wylewkę 10L', jednostka: 'l' },
  { sku: 'POD-WYKLADZINA', nazwa: 'Wykładzina dywanowa płytkowa 50x50', jednostka: 'm²' },
  { sku: 'POD-KLEJ-WYKL', nazwa: 'Klej do wykładzin 15kg', jednostka: 'kg' },

  // Farby
  { sku: 'FRB-DULUX-10L', nazwa: 'Dulux Latex Matt biała 10L', jednostka: 'l' },
  { sku: 'FRB-GRUNT-5L', nazwa: 'Grunt penetrujący Ceresit CT 17 5L', jednostka: 'l' },

  // Elektro
  { sku: 'ELE-YDYP-3X15', nazwa: 'Przewód YDYp 3x1.5mm² (100m)', jednostka: 'mb' },
  { sku: 'ELE-YDYP-3X25', nazwa: 'Przewód YDYp 3x2.5mm² (100m)', jednostka: 'mb' },
  { sku: 'ELE-GNIAZDO-2X', nazwa: 'Gniazdo podwójne Legrand Valena', jednostka: 'szt' },
  { sku: 'ELE-WYLACZNIK', nazwa: 'Wyłącznik jednobiegunowy Legrand', jednostka: 'szt' },
  { sku: 'ELE-LED-60X60', nazwa: 'Panel LED 60x60cm 40W 4000K', jednostka: 'szt' },
  { sku: 'ELE-LED-120X30', nazwa: 'Oprawa LED 120x30cm 36W 4000K', jednostka: 'szt' },
  { sku: 'ELE-PUSZKA-60', nazwa: 'Puszka podtynkowa fi60', jednostka: 'szt' },
  { sku: 'ELE-KORYTKO-H100', nazwa: 'Korytko kablowe 100x60 (3m)', jednostka: 'mb' },
  { sku: 'ELE-PESZEL-25', nazwa: 'Peszel karbowany fi25 (50m)', jednostka: 'mb' },
  { sku: 'ELE-RJ45-KAT6', nazwa: 'Gniazdo RJ45 kat.6 podwójne', jednostka: 'szt' },
  { sku: 'ELE-KABEL-U-UTP', nazwa: 'Kabel U/UTP kat.6 305m', jednostka: 'mb' },
  { sku: 'ELE-PATCH-PANEL', nazwa: 'Patch panel 24-portowy kat.6', jednostka: 'szt' },

  // Klimatyzacja
  { sku: 'HVAC-SPLIT-35', nazwa: 'Klimatyzator split 3.5kW z montażem', jednostka: 'kpl' },
  { sku: 'HVAC-RURA-CU', nazwa: 'Rura miedziana 1/4"+3/8" (para)', jednostka: 'mb' },
  { sku: 'HVAC-SKROPLINY', nazwa: 'Rura PVC fi32 skropliny', jednostka: 'mb' },

  // Sanitarne
  { sku: 'SAN-RURA-PP20', nazwa: 'Rura PP-R fi20 PN20', jednostka: 'mb' },
  { sku: 'SAN-RURA-PVC50', nazwa: 'Rura kanalizacyjna PVC fi50', jednostka: 'mb' },
  { sku: 'SAN-RURA-PVC110', nazwa: 'Rura kanalizacyjna PVC fi110', jednostka: 'mb' },
  { sku: 'SAN-ZAWOR-20', nazwa: 'Zawór kulowy fi20 mosiądz', jednostka: 'szt' },

  // Drzwi
  { sku: 'DRZWI-WEWN-90', nazwa: 'Drzwi wewnętrzne pełne 90x205 z ościeżnicą', jednostka: 'kpl' },
  { sku: 'DRZWI-SZKL-90', nazwa: 'Drzwi szklane 90x205 z samozamykaczem', jednostka: 'kpl' },
];

async function seedProdukty() {
  header('Seeding products...');
  let count = 0;

  for (const p of PRODUKTY) {
    await upsertOne('produkty', {
      sku: p.sku,
      nazwa: p.nazwa,
      jednostka: p.jednostka,
      kategoria: p.kategoria || null,
      aktywny: true,
      organization_id: ORG_ID,
    }, 'organization_id,sku');
    count++;
  }

  log(`${count} products upserted`);
}

// ---------------------------------------------------------------------------
// 3. Suppliers (dostawcy) + prices (ceny_dostawcow)
// ---------------------------------------------------------------------------

interface DostawcaSeed {
  kod: string;
  nazwa: string;
  kontakt: string;
  ceny: { sku: string; cena_netto: number }[];
}

const DOSTAWCY: DostawcaSeed[] = [
  {
    kod: 'KNF',
    nazwa: 'Knauf Dystrybutor',
    kontakt: 'knauf@example.com | +48 22 111 2222',
    ceny: [
      { sku: 'GK-CW50', cena_netto: 7.80 },
      { sku: 'GK-CW75', cena_netto: 9.50 },
      { sku: 'GK-CW100', cena_netto: 12.20 },
      { sku: 'GK-UW50', cena_netto: 6.90 },
      { sku: 'GK-UW75', cena_netto: 8.40 },
      { sku: 'GK-UW100', cena_netto: 10.80 },
      { sku: 'GK-PLYTA-125', cena_netto: 21.50 },
      { sku: 'GK-PLYTA-125-H2', cena_netto: 28.00 },
      { sku: 'GK-MASA-SZPACHL', cena_netto: 1.85 },
      { sku: 'GK-WKRETY-KPL', cena_netto: 32.00 },
      { sku: 'GK-TASMA-PAPIER', cena_netto: 0.18 },
    ],
  },
  {
    kod: 'ATL',
    nazwa: 'Hurtownia Atlas',
    kontakt: 'atlas@example.com | +48 42 333 4444',
    ceny: [
      { sku: 'POD-WYLEWKA-25', cena_netto: 1.60 },
      { sku: 'POD-GRUNT', cena_netto: 4.20 },
      { sku: 'GK-PLYTA-125', cena_netto: 22.80 },
      { sku: 'GK-CW75', cena_netto: 10.20 },
      { sku: 'GK-WELNA-50', cena_netto: 12.50 },
      { sku: 'GK-WELNA-100', cena_netto: 22.00 },
    ],
  },
  {
    kod: 'BRC',
    nazwa: 'Bricoman',
    kontakt: 'pro@bricoman.pl | +48 22 555 6666',
    ceny: [
      { sku: 'GK-CW75', cena_netto: 9.90 },
      { sku: 'GK-PLYTA-125', cena_netto: 20.90 },
      { sku: 'GK-CD60', cena_netto: 7.50 },
      { sku: 'GK-UD28', cena_netto: 5.80 },
      { sku: 'GK-WIESZAK-ES', cena_netto: 1.20 },
      { sku: 'GK-LACZNIK-CD', cena_netto: 0.85 },
      { sku: 'SUF-KASETON-60', cena_netto: 14.50 },
      { sku: 'SUF-RUSZT-T24', cena_netto: 4.80 },
      { sku: 'SUF-RUSZT-T24P', cena_netto: 2.10 },
      { sku: 'SUF-ZAWIESZKA', cena_netto: 1.40 },
      { sku: 'POD-WYKLADZINA', cena_netto: 42.00 },
      { sku: 'POD-KLEJ-WYKL', cena_netto: 5.60 },
      { sku: 'DRZWI-WEWN-90', cena_netto: 680.00 },
      { sku: 'DRZWI-SZKL-90', cena_netto: 2400.00 },
    ],
  },
  {
    kod: 'ELH',
    nazwa: 'Elektro-Hurt',
    kontakt: 'handel@elektro-hurt.pl | +48 12 777 8888',
    ceny: [
      { sku: 'ELE-YDYP-3X15', cena_netto: 2.10 },
      { sku: 'ELE-YDYP-3X25', cena_netto: 3.40 },
      { sku: 'ELE-GNIAZDO-2X', cena_netto: 28.50 },
      { sku: 'ELE-WYLACZNIK', cena_netto: 18.90 },
      { sku: 'ELE-LED-60X60', cena_netto: 89.00 },
      { sku: 'ELE-LED-120X30', cena_netto: 125.00 },
      { sku: 'ELE-PUSZKA-60', cena_netto: 1.20 },
      { sku: 'ELE-KORYTKO-H100', cena_netto: 18.50 },
      { sku: 'ELE-PESZEL-25', cena_netto: 1.10 },
      { sku: 'ELE-RJ45-KAT6', cena_netto: 32.00 },
      { sku: 'ELE-KABEL-U-UTP', cena_netto: 2.80 },
      { sku: 'ELE-PATCH-PANEL', cena_netto: 185.00 },
    ],
  },
  {
    kod: 'FPR',
    nazwa: 'Farby Premium',
    kontakt: 'biuro@farbypremium.pl | +48 61 999 0000',
    ceny: [
      { sku: 'FRB-DULUX-10L', cena_netto: 145.00 },
      { sku: 'FRB-GRUNT-5L', cena_netto: 38.00 },
    ],
  },
  {
    kod: 'HVC',
    nazwa: 'HVAC Solutions',
    kontakt: 'hvac@solutions.pl | +48 71 222 3333',
    ceny: [
      { sku: 'HVAC-SPLIT-35', cena_netto: 3200.00 },
      { sku: 'HVAC-RURA-CU', cena_netto: 45.00 },
      { sku: 'HVAC-SKROPLINY', cena_netto: 8.50 },
    ],
  },
  {
    kod: 'SIG',
    nazwa: 'SIG Materiały Instalacyjne',
    kontakt: 'sig@sig.pl | +48 22 444 5555',
    ceny: [
      { sku: 'SAN-RURA-PP20', cena_netto: 5.20 },
      { sku: 'SAN-RURA-PVC50', cena_netto: 8.90 },
      { sku: 'SAN-RURA-PVC110', cena_netto: 16.50 },
      { sku: 'SAN-ZAWOR-20', cena_netto: 22.00 },
    ],
  },
  {
    kod: 'WRT',
    nazwa: 'Würth Polska',
    kontakt: 'wurth@wurth.pl | +48 22 666 7777',
    ceny: [
      { sku: 'GK-WKRETY-KPL', cena_netto: 29.50 },
      { sku: 'GK-WIESZAK-ES', cena_netto: 1.10 },
      { sku: 'GK-LACZNIK-CD', cena_netto: 0.75 },
      { sku: 'ELE-PUSZKA-60', cena_netto: 0.95 },
      { sku: 'ELE-PESZEL-25', cena_netto: 0.90 },
    ],
  },
];

async function seedDostawcyICeny() {
  header('Seeding suppliers + prices...');
  let dostawcyCount = 0;
  let cenyCount = 0;

  for (const d of DOSTAWCY) {
    const dostawca = await upsertOne(
      'dostawcy',
      {
        kod: d.kod,
        nazwa: d.nazwa,
        kontakt: d.kontakt,
        aktywny: true,
        organization_id: ORG_ID,
      },
      'organization_id,kod'
    );
    dostawcyCount++;

    for (const c of d.ceny) {
      const produktId = await getIdByField('produkty', 'sku', c.sku);
      if (!produktId) {
        log(`  ⚠ Product ${c.sku} not found, skipping price`);
        continue;
      }

      const { error } = await supabase
        .from('ceny_dostawcow')
        .upsert(
          {
            dostawca_id: dostawca.id,
            produkt_id: produktId,
            cena_netto: c.cena_netto,
            aktywny: true,
          },
          { onConflict: 'dostawca_id,produkt_id' }
        );

      if (error) log(`  ⚠ Price ${d.kod}/${c.sku}: ${error.message}`);
      else cenyCount++;
    }
  }

  log(`${dostawcyCount} suppliers, ${cenyCount} prices upserted`);
}

// ---------------------------------------------------------------------------
// 4. Subcontractors (podwykonawcy) + rates (stawki)
// ---------------------------------------------------------------------------

interface PodwykonawcaSeed {
  nazwa: string;
  kontakt: string;
  specjalizacja: string;
}

const PODWYKONAWCY: PodwykonawcaSeed[] = [
  { nazwa: 'Ekipa GK "Budmont"', kontakt: 'budmont@example.com | +48 600 111 222', specjalizacja: 'GK, Sufity, Zabudowy' },
  { nazwa: 'Elektro-Mont', kontakt: 'elektromont@example.com | +48 600 333 444', specjalizacja: 'Instalacje elektryczne' },
  { nazwa: 'Malarze Pro', kontakt: 'malarze@example.com | +48 600 555 666', specjalizacja: 'Malowanie, tapetowanie' },
  { nazwa: 'Płytkarze OK', kontakt: 'plytkarze@example.com | +48 600 777 888', specjalizacja: 'Glazura, gres, posadzki' },
  { nazwa: 'Tynki-Expres', kontakt: 'tynki@example.com | +48 600 999 000', specjalizacja: 'Tynki maszynowe, wylewki' },
  { nazwa: 'KlimaVent sp. z o.o.', kontakt: 'klimavent@example.com | +48 601 111 222', specjalizacja: 'Klimatyzacja, wentylacja' },
  { nazwa: 'SanTech Instalacje', kontakt: 'santech@example.com | +48 601 333 444', specjalizacja: 'Hydraulika, wod-kan' },
  { nazwa: 'NetBuild Teletechnika', kontakt: 'netbuild@example.com | +48 601 555 666', specjalizacja: 'Sieci LAN, teletechnika' },
];

async function seedPodwykonawcy() {
  header('Seeding subcontractors...');
  let count = 0;

  for (const p of PODWYKONAWCY) {
    await upsertOne(
      'podwykonawcy',
      {
        nazwa: p.nazwa,
        kontakt: p.kontakt,
        specjalizacja: p.specjalizacja,
        aktywny: true,
        organization_id: ORG_ID,
      },
      'organization_id,nazwa'
    );
    count++;
  }

  log(`${count} subcontractors upserted`);
}

// ---------------------------------------------------------------------------
// 5. Library position components (THE CRITICAL PIECE)
// ---------------------------------------------------------------------------

interface SkladowaMSeed {
  nazwa: string;
  sku: string; // links to produkt
  norma_domyslna: number;
  cena_domyslna: number;
  jednostka: string;
}

interface SkladowaRSeed {
  opis: string;
  norma_domyslna: number; // rbh per unit
  stawka_domyslna: number; // PLN/rbh
  jednostka: string;
  podwykonawca_nazwa?: string;
}

interface PozycjaSkladoweSeed {
  kod: string; // pozycja_biblioteka.kod
  materialy: SkladowaMSeed[];
  robocizna: SkladowaRSeed[];
}

const SKLADOWE_SEED: PozycjaSkladoweSeed[] = [
  // ---------- BUD.02.01.001 - Ścianka GK pojedyncza CW75 1x12.5mm (m²) ----------
  {
    kod: 'BUD.02.01.001',
    materialy: [
      { nazwa: 'Profil CW 75', sku: 'GK-CW75', norma_domyslna: 0.9, cena_domyslna: 9.50, jednostka: 'mb' },
      { nazwa: 'Profil UW 75', sku: 'GK-UW75', norma_domyslna: 0.7, cena_domyslna: 8.40, jednostka: 'mb' },
      { nazwa: 'Płyta GK 12.5mm', sku: 'GK-PLYTA-125', norma_domyslna: 1.05, cena_domyslna: 21.50, jednostka: 'm²' },
      { nazwa: 'Wkręty do GK (op)', sku: 'GK-WKRETY-KPL', norma_domyslna: 0.02, cena_domyslna: 32.00, jednostka: 'op' },
      { nazwa: 'Taśma papierowa', sku: 'GK-TASMA-PAPIER', norma_domyslna: 0.3, cena_domyslna: 0.18, jednostka: 'mb' },
      { nazwa: 'Masa szpachlowa', sku: 'GK-MASA-SZPACHL', norma_domyslna: 0.3, cena_domyslna: 1.85, jednostka: 'kg' },
      { nazwa: 'Wełna mineralna 50mm', sku: 'GK-WELNA-50', norma_domyslna: 1.0, cena_domyslna: 12.50, jednostka: 'm²' },
    ],
    robocizna: [
      { opis: 'Montaż profili CW+UW', norma_domyslna: 0.25, stawka_domyslna: 45.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Montaż płyt GK', norma_domyslna: 0.20, stawka_domyslna: 45.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Szpachlowanie i szlifowanie', norma_domyslna: 0.15, stawka_domyslna: 45.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
    ],
  },

  // ---------- BUD.02.01.003 - Ścianka GK podwójna CW75 2x12.5mm (m²) ----------
  {
    kod: 'BUD.02.01.003',
    materialy: [
      { nazwa: 'Profil CW 75', sku: 'GK-CW75', norma_domyslna: 0.9, cena_domyslna: 9.50, jednostka: 'mb' },
      { nazwa: 'Profil UW 75', sku: 'GK-UW75', norma_domyslna: 0.7, cena_domyslna: 8.40, jednostka: 'mb' },
      { nazwa: 'Płyta GK 12.5mm (x2)', sku: 'GK-PLYTA-125', norma_domyslna: 2.10, cena_domyslna: 21.50, jednostka: 'm²' },
      { nazwa: 'Wkręty do GK (op)', sku: 'GK-WKRETY-KPL', norma_domyslna: 0.04, cena_domyslna: 32.00, jednostka: 'op' },
      { nazwa: 'Taśma papierowa', sku: 'GK-TASMA-PAPIER', norma_domyslna: 0.3, cena_domyslna: 0.18, jednostka: 'mb' },
      { nazwa: 'Masa szpachlowa', sku: 'GK-MASA-SZPACHL', norma_domyslna: 0.3, cena_domyslna: 1.85, jednostka: 'kg' },
      { nazwa: 'Wełna mineralna 100mm', sku: 'GK-WELNA-100', norma_domyslna: 1.0, cena_domyslna: 22.00, jednostka: 'm²' },
    ],
    robocizna: [
      { opis: 'Montaż profili CW+UW', norma_domyslna: 0.25, stawka_domyslna: 45.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Montaż podwójnych płyt GK', norma_domyslna: 0.35, stawka_domyslna: 45.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Szpachlowanie i szlifowanie', norma_domyslna: 0.15, stawka_domyslna: 45.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
    ],
  },

  // ---------- BUD.05.01.001 - Sufit podwieszany kasetonowy mineralny 60x60 (m²) ----------
  {
    kod: 'BUD.05.01.001',
    materialy: [
      { nazwa: 'Kaseton mineralny 60x60', sku: 'SUF-KASETON-60', norma_domyslna: 2.78, cena_domyslna: 14.50, jednostka: 'szt' },
      { nazwa: 'Ruszt T24 główny', sku: 'SUF-RUSZT-T24', norma_domyslna: 1.7, cena_domyslna: 4.80, jednostka: 'mb' },
      { nazwa: 'Ruszt T24 poprzeczny', sku: 'SUF-RUSZT-T24P', norma_domyslna: 2.78, cena_domyslna: 2.10, jednostka: 'szt' },
      { nazwa: 'Zawieszka sufitowa', sku: 'SUF-ZAWIESZKA', norma_domyslna: 1.2, cena_domyslna: 1.40, jednostka: 'szt' },
      { nazwa: 'Profil UD 28 obwodowy', sku: 'GK-UD28', norma_domyslna: 0.4, cena_domyslna: 5.80, jednostka: 'mb' },
    ],
    robocizna: [
      { opis: 'Montaż rusztu sufitowego', norma_domyslna: 0.25, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Montaż kasetonów', norma_domyslna: 0.10, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
    ],
  },

  // ---------- BUD.05.02.001 - Sufit z płyt GK na ruszcie pojedynczym CD60 (m²) ----------
  {
    kod: 'BUD.05.02.001',
    materialy: [
      { nazwa: 'Profil CD 60x27', sku: 'GK-CD60', norma_domyslna: 3.2, cena_domyslna: 7.50, jednostka: 'mb' },
      { nazwa: 'Profil UD 28 obwodowy', sku: 'GK-UD28', norma_domyslna: 0.4, cena_domyslna: 5.80, jednostka: 'mb' },
      { nazwa: 'Wieszak ES', sku: 'GK-WIESZAK-ES', norma_domyslna: 1.2, cena_domyslna: 1.20, jednostka: 'szt' },
      { nazwa: 'Płyta GK 12.5mm', sku: 'GK-PLYTA-125', norma_domyslna: 1.05, cena_domyslna: 21.50, jednostka: 'm²' },
      { nazwa: 'Wkręty do GK', sku: 'GK-WKRETY-KPL', norma_domyslna: 0.02, cena_domyslna: 32.00, jednostka: 'op' },
      { nazwa: 'Masa szpachlowa', sku: 'GK-MASA-SZPACHL', norma_domyslna: 0.5, cena_domyslna: 1.85, jednostka: 'kg' },
    ],
    robocizna: [
      { opis: 'Montaż rusztu CD60', norma_domyslna: 0.30, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Montaż płyt GK sufit', norma_domyslna: 0.25, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
      { opis: 'Szpachlowanie sufitu', norma_domyslna: 0.20, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
    ],
  },

  // ---------- BUD.04.01.001 - Wylewka samopoziomująca gr. 3-5mm (m²) ----------
  {
    kod: 'BUD.04.01.001',
    materialy: [
      { nazwa: 'Wylewka samopoziomująca', sku: 'POD-WYLEWKA-25', norma_domyslna: 6.0, cena_domyslna: 1.60, jednostka: 'kg' },
      { nazwa: 'Grunt pod wylewkę', sku: 'POD-GRUNT', norma_domyslna: 0.15, cena_domyslna: 4.20, jednostka: 'l' },
    ],
    robocizna: [
      { opis: 'Przygotowanie podłoża + gruntowanie', norma_domyslna: 0.10, stawka_domyslna: 40.00, jednostka: 'rbh', podwykonawca_nazwa: 'Tynki-Expres' },
      { opis: 'Wykonanie wylewki samopoziomującej', norma_domyslna: 0.15, stawka_domyslna: 40.00, jednostka: 'rbh', podwykonawca_nazwa: 'Tynki-Expres' },
    ],
  },

  // ---------- BUD.04.02.001 - Wykładzina dywanowa płytkowa 50x50cm (m²) ----------
  {
    kod: 'BUD.04.02.001',
    materialy: [
      { nazwa: 'Wykładzina dywanowa płytkowa', sku: 'POD-WYKLADZINA', norma_domyslna: 1.05, cena_domyslna: 42.00, jednostka: 'm²' },
      { nazwa: 'Klej do wykładzin', sku: 'POD-KLEJ-WYKL', norma_domyslna: 0.4, cena_domyslna: 5.60, jednostka: 'kg' },
    ],
    robocizna: [
      { opis: 'Układanie wykładziny płytkowej', norma_domyslna: 0.20, stawka_domyslna: 38.00, jednostka: 'rbh', podwykonawca_nazwa: 'Płytkarze OK' },
    ],
  },

  // ---------- BUD.04.03.001 - Posadzka z gresu technicznego 60x60 (m²) ----------
  {
    kod: 'BUD.04.03.001',
    materialy: [
      { nazwa: 'Gres techniczny 60x60', sku: 'PLT-GRES-60X60', norma_domyslna: 1.05, cena_domyslna: 65.00, jednostka: 'm²' },
      { nazwa: 'Klej Atlas Plus', sku: 'PLT-KLEJ-25KG', norma_domyslna: 5.0, cena_domyslna: 1.40, jednostka: 'kg' },
      { nazwa: 'Fuga Mapei', sku: 'PLT-FUGA-5KG', norma_domyslna: 0.5, cena_domyslna: 6.80, jednostka: 'kg' },
    ],
    robocizna: [
      { opis: 'Układanie gresu 60x60', norma_domyslna: 0.40, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Płytkarze OK' },
      { opis: 'Fugowanie', norma_domyslna: 0.10, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Płytkarze OK' },
    ],
  },

  // ---------- ELE.03.01.001 → find first ELE.03.01 position: gniazdo ----------
  {
    kod: 'ELE.03.01.001',
    materialy: [
      { nazwa: 'Gniazdo podwójne Legrand', sku: 'ELE-GNIAZDO-2X', norma_domyslna: 1.0, cena_domyslna: 28.50, jednostka: 'szt' },
      { nazwa: 'Puszka podtynkowa fi60', sku: 'ELE-PUSZKA-60', norma_domyslna: 1.0, cena_domyslna: 1.20, jednostka: 'szt' },
      { nazwa: 'Przewód YDYp 3x2.5', sku: 'ELE-YDYP-3X25', norma_domyslna: 8.0, cena_domyslna: 3.40, jednostka: 'mb' },
      { nazwa: 'Peszel fi25', sku: 'ELE-PESZEL-25', norma_domyslna: 8.0, cena_domyslna: 1.10, jednostka: 'mb' },
    ],
    robocizna: [
      { opis: 'Wykucie bruzd i montaż puszki', norma_domyslna: 0.40, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Elektro-Mont' },
      { opis: 'Ułożenie przewodów', norma_domyslna: 0.30, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Elektro-Mont' },
      { opis: 'Podłączenie osprzętu', norma_domyslna: 0.20, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Elektro-Mont' },
    ],
  },

  // ---------- ELE.02.01.001 → oprawa LED ----------
  {
    kod: 'ELE.02.01.001',
    materialy: [
      { nazwa: 'Panel LED 60x60 40W', sku: 'ELE-LED-60X60', norma_domyslna: 1.0, cena_domyslna: 89.00, jednostka: 'szt' },
      { nazwa: 'Przewód YDYp 3x1.5', sku: 'ELE-YDYP-3X15', norma_domyslna: 5.0, cena_domyslna: 2.10, jednostka: 'mb' },
    ],
    robocizna: [
      { opis: 'Montaż oprawy LED w suficie', norma_domyslna: 0.30, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Elektro-Mont' },
      { opis: 'Podłączenie i test', norma_domyslna: 0.15, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Elektro-Mont' },
    ],
  },

  // ---------- ELE.01.01.001 → korytka kablowe H100 ----------
  {
    kod: 'ELE.01.01.001',
    materialy: [
      { nazwa: 'Korytko kablowe H100', sku: 'ELE-KORYTKO-H100', norma_domyslna: 1.0, cena_domyslna: 18.50, jednostka: 'mb' },
    ],
    robocizna: [
      { opis: 'Montaż korytka kablowego', norma_domyslna: 0.25, stawka_domyslna: 55.00, jednostka: 'rbh', podwykonawca_nazwa: 'Elektro-Mont' },
    ],
  },

  // ---------- BUD.01.01.001 - Rozbiórka ścian GK (m²) ----------
  {
    kod: 'BUD.01.01.001',
    materialy: [],
    robocizna: [
      { opis: 'Demontaż ścian GK z utylizacją', norma_domyslna: 0.20, stawka_domyslna: 35.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
    ],
  },

  // ---------- BUD.01.03.001 - Demontaż sufitu kasetonowego (m²) ----------
  {
    kod: 'BUD.01.03.001',
    materialy: [],
    robocizna: [
      { opis: 'Demontaż sufitu z utylizacją', norma_domyslna: 0.15, stawka_domyslna: 35.00, jednostka: 'rbh', podwykonawca_nazwa: 'Ekipa GK "Budmont"' },
    ],
  },

  // ---------- SAN.01.01.001 - Rura PP-R fi20 wody zimnej (mb) ----------
  {
    kod: 'SAN.01.01.001',
    materialy: [
      { nazwa: 'Rura PP-R fi20', sku: 'SAN-RURA-PP20', norma_domyslna: 1.1, cena_domyslna: 5.20, jednostka: 'mb' },
    ],
    robocizna: [
      { opis: 'Montaż rury PP-R fi20 z uchwytami', norma_domyslna: 0.20, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'SanTech Instalacje' },
    ],
  },

  // ---------- SAN.02.01.001 - Rura kanalizacyjna PVC fi50 (mb) ----------
  {
    kod: 'SAN.02.01.001',
    materialy: [
      { nazwa: 'Rura PVC fi50', sku: 'SAN-RURA-PVC50', norma_domyslna: 1.1, cena_domyslna: 8.90, jednostka: 'mb' },
    ],
    robocizna: [
      { opis: 'Montaż rury kanalizacyjnej fi50', norma_domyslna: 0.18, stawka_domyslna: 50.00, jednostka: 'rbh', podwykonawca_nazwa: 'SanTech Instalacje' },
    ],
  },

  // ---------- TEL (first position - we need to find it) ----------
  // We'll handle this dynamically below
];

// Some missing PLT products need seeding too
const PLT_PRODUKTY_EXTRA: ProduktSeed[] = [
  { sku: 'PLT-GRES-60X60', nazwa: 'Gres techniczny 60x60', jednostka: 'm²' },
  { sku: 'PLT-KLEJ-25KG', nazwa: 'Klej Atlas Plus 25kg', jednostka: 'kg' },
  { sku: 'PLT-FUGA-5KG', nazwa: 'Fuga Mapei 5kg', jednostka: 'kg' },
];

async function seedSkladowe() {
  header('Seeding library position components (skladowe)...');

  // First, ensure PLT products exist (they might already from seed data)
  for (const p of PLT_PRODUKTY_EXTRA) {
    await upsertOne('produkty', {
      sku: p.sku,
      nazwa: p.nazwa,
      jednostka: p.jednostka,
      aktywny: true,
      organization_id: ORG_ID,
    }, 'organization_id,sku');
  }

  // Add PLT prices
  const prdId = await getIdByField('dostawcy', 'kod', 'PRD');
  if (prdId) {
    for (const p of PLT_PRODUKTY_EXTRA) {
      const produktId = await getIdByField('produkty', 'sku', p.sku);
      if (produktId) {
        const prices: Record<string, number> = {
          'PLT-GRES-60X60': 62.00,
          'PLT-KLEJ-25KG': 1.30,
          'PLT-FUGA-5KG': 6.50,
        };
        await supabase
          .from('ceny_dostawcow')
          .upsert({
            dostawca_id: prdId,
            produkt_id: produktId,
            cena_netto: prices[p.sku] || 10.0,
            aktywny: true,
          }, { onConflict: 'dostawca_id,produkt_id' });
      }
    }
  }

  // Cache product IDs and subcontractor IDs
  const produktIdCache: Record<string, string> = {};
  const podwykonawcaIdCache: Record<string, string> = {};

  let mCount = 0;
  let rCount = 0;

  for (const seed of SKLADOWE_SEED) {
    // Find pozycja_biblioteka by kod
    const { data: pozycja } = await supabase
      .from('pozycje_biblioteka')
      .select('id')
      .eq('kod', seed.kod)
      .eq('organization_id', ORG_ID)
      .single();

    if (!pozycja) {
      log(`⚠ Position ${seed.kod} not found, skipping`);
      continue;
    }

    const pozycjaId = pozycja.id;

    // Clear existing składowe for this position
    await supabase
      .from('biblioteka_skladowe_materialy')
      .delete()
      .eq('pozycja_biblioteka_id', pozycjaId);
    await supabase
      .from('biblioteka_skladowe_robocizna')
      .delete()
      .eq('pozycja_biblioteka_id', pozycjaId);

    // Insert materiały
    for (let i = 0; i < seed.materialy.length; i++) {
      const m = seed.materialy[i];

      // Resolve produkt_id
      if (!produktIdCache[m.sku]) {
        const id = await getIdByField('produkty', 'sku', m.sku);
        if (id) produktIdCache[m.sku] = id;
      }

      // Find cheapest supplier for this product
      let dostawcaId: string | null = null;
      const produktId = produktIdCache[m.sku] || null;
      if (produktId) {
        const { data: cheapest } = await supabase
          .from('ceny_dostawcow')
          .select('dostawca_id')
          .eq('produkt_id', produktId)
          .eq('aktywny', true)
          .order('cena_netto', { ascending: true })
          .limit(1)
          .single();
        dostawcaId = cheapest?.dostawca_id ?? null;
      }

      const { error } = await supabase
        .from('biblioteka_skladowe_materialy')
        .insert({
          pozycja_biblioteka_id: pozycjaId,
          lp: i + 1,
          nazwa: m.nazwa,
          norma_domyslna: m.norma_domyslna,
          cena_domyslna: m.cena_domyslna,
          jednostka: m.jednostka,
          produkt_id: produktId,
          dostawca_id: dostawcaId,
        });

      if (error) log(`  ⚠ Material ${seed.kod}/${m.nazwa}: ${error.message}`);
      else mCount++;
    }

    // Insert robocizna
    for (let i = 0; i < seed.robocizna.length; i++) {
      const r = seed.robocizna[i];

      // Resolve podwykonawca_id
      let podwykonawcaId: string | null = null;
      if (r.podwykonawca_nazwa) {
        if (!podwykonawcaIdCache[r.podwykonawca_nazwa]) {
          const { data } = await supabase
            .from('podwykonawcy')
            .select('id')
            .eq('nazwa', r.podwykonawca_nazwa)
            .eq('organization_id', ORG_ID)
            .single();
          if (data) podwykonawcaIdCache[r.podwykonawca_nazwa] = data.id;
        }
        podwykonawcaId = podwykonawcaIdCache[r.podwykonawca_nazwa] || null;
      }

      const { error } = await supabase
        .from('biblioteka_skladowe_robocizna')
        .insert({
          pozycja_biblioteka_id: pozycjaId,
          lp: i + 1,
          opis: r.opis,
          norma_domyslna: r.norma_domyslna,
          stawka_domyslna: r.stawka_domyslna,
          jednostka: r.jednostka,
          podwykonawca_id: podwykonawcaId,
        });

      if (error) log(`  ⚠ Robocizna ${seed.kod}/${r.opis}: ${error.message}`);
      else rCount++;
    }

    log(`✓ ${seed.kod} → ${seed.materialy.length}M + ${seed.robocizna.length}R`);
  }

  log(`Total: ${mCount} material components, ${rCount} labor components`);
}

// ---------------------------------------------------------------------------
// 6. Subcontractor rates (stawki_podwykonawcow)
// ---------------------------------------------------------------------------

interface StawkaSeed {
  podwykonawca_nazwa: string;
  pozycja_kod: string;
  stawka: number;
}

const STAWKI: StawkaSeed[] = [
  // Budmont - GK & sufity
  { podwykonawca_nazwa: 'Ekipa GK "Budmont"', pozycja_kod: 'BUD.02.01.001', stawka: 42.00 },
  { podwykonawca_nazwa: 'Ekipa GK "Budmont"', pozycja_kod: 'BUD.02.01.003', stawka: 48.00 },
  { podwykonawca_nazwa: 'Ekipa GK "Budmont"', pozycja_kod: 'BUD.05.01.001', stawka: 45.00 },
  { podwykonawca_nazwa: 'Ekipa GK "Budmont"', pozycja_kod: 'BUD.05.02.001', stawka: 50.00 },
  { podwykonawca_nazwa: 'Ekipa GK "Budmont"', pozycja_kod: 'BUD.01.01.001', stawka: 32.00 },
  { podwykonawca_nazwa: 'Ekipa GK "Budmont"', pozycja_kod: 'BUD.01.03.001', stawka: 30.00 },

  // Elektro-Mont
  { podwykonawca_nazwa: 'Elektro-Mont', pozycja_kod: 'ELE.03.01.001', stawka: 52.00 },
  { podwykonawca_nazwa: 'Elektro-Mont', pozycja_kod: 'ELE.02.01.001', stawka: 50.00 },
  { podwykonawca_nazwa: 'Elektro-Mont', pozycja_kod: 'ELE.01.01.001', stawka: 48.00 },

  // Płytkarze OK
  { podwykonawca_nazwa: 'Płytkarze OK', pozycja_kod: 'BUD.04.02.001', stawka: 35.00 },
  { podwykonawca_nazwa: 'Płytkarze OK', pozycja_kod: 'BUD.04.03.001', stawka: 52.00 },

  // Tynki-Expres
  { podwykonawca_nazwa: 'Tynki-Expres', pozycja_kod: 'BUD.04.01.001', stawka: 38.00 },

  // SanTech
  { podwykonawca_nazwa: 'SanTech Instalacje', pozycja_kod: 'SAN.01.01.001', stawka: 48.00 },
  { podwykonawca_nazwa: 'SanTech Instalacje', pozycja_kod: 'SAN.02.01.001', stawka: 45.00 },
];

async function seedStawki() {
  header('Seeding subcontractor rates...');

  // Clear existing
  await supabase.from('stawki_podwykonawcow').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  let count = 0;

  for (const s of STAWKI) {
    // Get podwykonawca_id
    const { data: pod } = await supabase
      .from('podwykonawcy')
      .select('id')
      .eq('nazwa', s.podwykonawca_nazwa)
      .eq('organization_id', ORG_ID)
      .single();

    if (!pod) {
      log(`⚠ Subcontractor ${s.podwykonawca_nazwa} not found`);
      continue;
    }

    // Get pozycja_biblioteka_id
    const { data: poz } = await supabase
      .from('pozycje_biblioteka')
      .select('id')
      .eq('kod', s.pozycja_kod)
      .eq('organization_id', ORG_ID)
      .single();

    if (!poz) {
      log(`⚠ Position ${s.pozycja_kod} not found`);
      continue;
    }

    const { error } = await supabase
      .from('stawki_podwykonawcow')
      .insert({
        podwykonawca_id: pod.id,
        pozycja_biblioteka_id: poz.id,
        stawka: s.stawka,
        aktywny: true,
      });

    if (error) {
      if (error.code === '23505') {
        // Already exists — update
        await supabase
          .from('stawki_podwykonawcow')
          .update({ stawka: s.stawka })
          .eq('podwykonawca_id', pod.id)
          .eq('pozycja_biblioteka_id', poz.id);
      } else {
        log(`⚠ Stawka ${s.podwykonawca_nazwa}/${s.pozycja_kod}: ${error.message}`);
        continue;
      }
    }
    count++;
  }

  log(`${count} rates seeded`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 PLANY App — Seed Script');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Org: ${ORG_ID}`);

  await cleanup();
  await seedProdukty();
  await seedDostawcyICeny();
  await seedPodwykonawcy();
  await seedSkladowe();
  await seedStawki();

  // Summary
  header('Summary');
  const counts = await Promise.all([
    supabase.from('produkty').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID),
    supabase.from('dostawcy').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID),
    supabase.from('ceny_dostawcow').select('id', { count: 'exact', head: true }),
    supabase.from('podwykonawcy').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID),
    supabase.from('stawki_podwykonawcow').select('id', { count: 'exact', head: true }),
    supabase.from('biblioteka_skladowe_materialy').select('id', { count: 'exact', head: true }),
    supabase.from('biblioteka_skladowe_robocizna').select('id', { count: 'exact', head: true }),
  ]);

  log(`Produkty:          ${counts[0].count}`);
  log(`Dostawcy:          ${counts[1].count}`);
  log(`Ceny dostawców:    ${counts[2].count}`);
  log(`Podwykonawcy:      ${counts[3].count}`);
  log(`Stawki:            ${counts[4].count}`);
  log(`Składowe materiały: ${counts[5].count}`);
  log(`Składowe robocizna: ${counts[6].count}`);

  console.log('\n✅ Seed complete! Run `npm run simulate` to create a demo project.');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
