import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabase,
  createTestOrganization,
  cleanupOrganization,
  createKategoriaHierarchy,
  createPozycjaBiblioteka,
  createDostawca,
  createProdukt,
  createCenaDostawcy,
  createPodwykonawca,
  createStawkaPodwykonawcy,
  createBibliotekaSkladowaM,
  updatePozycjaCenaRobocizny,
  createProjekt,
  createRewizja,
  createKosztorysPozycja,
  createKosztorysSkladowaM,
} from './helpers/setup';

describe('Kosztorys -> Umowy via generate_umowy_draft', () => {
  let orgId: string;
  let projektId: string;
  let rewizjaId: string;
  let kowalskiId: string;
  let umowaId: string;

  beforeAll(async () => {
    const org = await createTestOrganization('umowy');
    orgId = org.id;

    const hier = await createKategoriaHierarchy(
      orgId,
      { kod: 'BUD', nazwa: 'Budowlana' },
      { kod: '01', nazwa: 'Gipskarton' },
      { kod: '01', nazwa: 'Ściany' }
    );

    const pozycja = await createPozycjaBiblioteka(orgId, {
      kategoria_id: hier.podkategoria.id,
      kod: 'BUD.01.01.001',
      nazwa: 'Ściana GK C50',
      jednostka: 'm2',
      typ: 'komplet',
    });

    const bricoman = await createDostawca(orgId, { nazwa: 'Bricoman', kod: 'BRIC' });
    const profil = await createProdukt(orgId, { sku: 'PRF-C50', nazwa: 'Profil C50', jednostka: 'mb' });
    await createCenaDostawcy({ dostawca_id: bricoman.id, produkt_id: profil.id, cena_netto: 8.5 });

    const kowalski = await createPodwykonawca(orgId, { nazwa: 'Kowalski', specjalizacja: 'gipskarton' });
    kowalskiId = kowalski.id;
    await createStawkaPodwykonawcy({ podwykonawca_id: kowalski.id, pozycja_biblioteka_id: pozycja.id, stawka: 45.0 });

    // Library templates (materials only)
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 1, nazwa: 'Profil C50', produkt_id: profil.id, dostawca_id: bricoman.id, cena_domyslna: 8.5, norma_domyslna: 0.9, jednostka: 'mb' });

    // Flat labor price: 15.0*0.3 + 12.0*0.2 = 6.90
    await updatePozycjaCenaRobocizny(pozycja.id, 6.90);

    // Projekt + Rewizja
    const projekt = await createProjekt(orgId, { nazwa: 'Biuro Test', powierzchnia: 500 });
    projektId = projekt.id;
    const rewizja = await createRewizja({ projekt_id: projektId });
    rewizjaId = rewizja.id;

    // Kosztorys pozycja (320 m2, 30% markup)
    const kp = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pozycja.id,
      lp: 1,
      nazwa: 'Ściana GK C50',
      ilosc: 320,
      jednostka: 'm2',
      narzut_percent: 30,
    });

    // Copy składowe to kosztorys (materials only)
    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kp.id, lp: 1, nazwa: 'Profil C50', produkt_id: profil.id, dostawca_id: bricoman.id, cena: 8.5, norma: 0.9 });

    // Set flat labor price + podwykonawca on kosztorys_pozycje
    await supabase.from('kosztorys_pozycje').update({
      cena_robocizny: 6.90,
      cena_robocizny_zrodlo: 'podwykonawca',
      podwykonawca_id: kowalski.id,
    }).eq('id', kp.id);

    // Lock revision
    await supabase
      .from('rewizje')
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .eq('id', rewizjaId);

    // State machine: draft → ofertowanie → realizacja
    await supabase.rpc('change_project_status', {
      p_projekt_id: projektId,
      p_new_status: 'ofertowanie',
    });
    await supabase.rpc('change_project_status', {
      p_projekt_id: projektId,
      p_new_status: 'realizacja',
      p_rewizja_id: rewizjaId,
    });

    // Generate umowy draft
    await supabase.rpc('generate_umowy_draft', {
      p_projekt_id: projektId,
      p_rewizja_id: rewizjaId,
    });
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('generate_umowy_draft creates contract for subcontractor', async () => {
    const { data, error } = await supabase
      .from('umowy')
      .select('*')
      .eq('projekt_id', projektId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const umowa = data![0];
    umowaId = umowa.id;
    expect(umowa.podwykonawca_id).toBe(kowalskiId);
    expect(umowa.status).toBe('draft');
    expect(umowa.rewizja_id).toBe(rewizjaId);
  });

  it('umowa_pozycje contain positions from kosztorys', async () => {
    const { data, error } = await supabase
      .from('umowa_pozycje')
      .select('*')
      .eq('umowa_id', umowaId)
      .order('stawka', { ascending: false });

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);

    // Verify each has correct data
    for (const up of data!) {
      expect(up.nazwa).toBeDefined();
      expect(Number(up.ilosc)).toBeGreaterThan(0);
      expect(Number(up.stawka)).toBeGreaterThan(0);
    }
  });

  it('contract status transitions work', async () => {
    // draft → wyslana
    const { error: e1 } = await supabase
      .from('umowy')
      .update({ status: 'wyslana' })
      .eq('id', umowaId);
    expect(e1).toBeNull();

    const { data: d1 } = await supabase.from('umowy').select('status').eq('id', umowaId).single();
    expect(d1!.status).toBe('wyslana');

    // wyslana → podpisana
    const { error: e2 } = await supabase
      .from('umowy')
      .update({ status: 'podpisana', data_podpisania: '2026-02-01' })
      .eq('id', umowaId);
    expect(e2).toBeNull();

    const { data: d2 } = await supabase.from('umowy').select('status').eq('id', umowaId).single();
    expect(d2!.status).toBe('podpisana');
  });

  it('umowa_wykonanie tracks labor progress', async () => {
    // Get first umowa_pozycja
    const { data: pozycje } = await supabase
      .from('umowa_pozycje')
      .select('id, ilosc')
      .eq('umowa_id', umowaId)
      .order('ilosc', { ascending: false })
      .limit(1);

    const up = pozycje![0];
    const totalIlosc = Number(up.ilosc);

    // First execution entry: 30 units
    await supabase.from('umowa_wykonanie').insert({
      umowa_pozycja_id: up.id,
      data_wpisu: '2026-01-15',
      ilosc_wykonana: 30,
    });

    await supabase
      .from('umowa_pozycje')
      .update({
        ilosc_wykonana: 30,
        procent_wykonania: (30 / totalIlosc) * 100,
      })
      .eq('id', up.id);

    const { data: d1 } = await supabase.from('umowa_pozycje').select('ilosc_wykonana, procent_wykonania').eq('id', up.id).single();
    expect(Number(d1!.ilosc_wykonana)).toBe(30);
    expect(Number(d1!.procent_wykonania)).toBeCloseTo((30 / totalIlosc) * 100, 0);

    // Second entry: remaining
    const remaining = totalIlosc - 30;
    await supabase.from('umowa_wykonanie').insert({
      umowa_pozycja_id: up.id,
      data_wpisu: '2026-02-01',
      ilosc_wykonana: remaining,
    });

    await supabase
      .from('umowa_pozycje')
      .update({
        ilosc_wykonana: totalIlosc,
        procent_wykonania: 100,
      })
      .eq('id', up.id);

    const { data: d2 } = await supabase.from('umowa_pozycje').select('ilosc_wykonana, procent_wykonania').eq('id', up.id).single();
    expect(Number(d2!.ilosc_wykonana)).toBeCloseTo(totalIlosc, 0);
    expect(Number(d2!.procent_wykonania)).toBeCloseTo(100, 0);
  });
});
