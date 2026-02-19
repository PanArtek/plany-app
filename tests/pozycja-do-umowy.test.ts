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
  createTypRobocizny,
  createStawkaPodwykonawcy,
  createBibliotekaSkladowaM,
  createBibliotekaSkladowaR,
  createProjekt,
  createRewizja,
  createKosztorysPozycja,
  createKosztorysSkladowaM,
  createKosztorysSkladowaR,
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

    const typMontaz = await createTypRobocizny(orgId, { nazwa: 'Montaż profili' });
    const typSzpachl = await createTypRobocizny(orgId, { nazwa: 'Szpachlowanie' });

    await createStawkaPodwykonawcy({ podwykonawca_id: kowalski.id, typ_robocizny_id: typMontaz.id, stawka: 15.0 });
    await createStawkaPodwykonawcy({ podwykonawca_id: kowalski.id, typ_robocizny_id: typSzpachl.id, stawka: 12.0 });

    // Library templates: cena = stawka rate
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 1, produkt_id: profil.id, dostawca_id: bricoman.id, norma_domyslna: 0.9, jednostka: 'mb' });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pozycja.id, lp: 1, typ_robocizny_id: typMontaz.id, podwykonawca_id: kowalski.id, cena: 15.0 });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pozycja.id, lp: 2, typ_robocizny_id: typSzpachl.id, podwykonawca_id: kowalski.id, cena: 12.0 });

    // Projekt + Rewizja
    const projekt = await createProjekt(orgId, { nazwa: 'Biuro Test', powierzchnia: 500 });
    projektId = projekt.id;
    const rewizja = await createRewizja({ projekt_id: projektId });
    rewizjaId = rewizja.id;

    const kp = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pozycja.id,
      lp: 1,
      nazwa: 'Ściana GK C50',
      ilosc: 320,
      jednostka: 'm2',
      narzut_percent: 30,
    });

    // Kosztorys skladowe: robocizna cena = stawka * norma (per-unit contribution)
    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kp.id, lp: 1, produkt_id: profil.id, dostawca_id: bricoman.id, cena: 8.5, norma: 0.9 });
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kp.id, lp: 1, typ_robocizny_id: typMontaz.id, podwykonawca_id: kowalski.id, cena: 4.5 }); // 15*0.3
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kp.id, lp: 2, typ_robocizny_id: typSzpachl.id, podwykonawca_id: kowalski.id, cena: 2.4 }); // 12*0.2

    // Lock revision
    await supabase
      .from('rewizje')
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .eq('id', rewizjaId);

    // State machine: draft → ofertowanie → realizacja
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'ofertowanie' });
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'realizacja', p_rewizja_id: rewizjaId });

    await supabase.rpc('generate_umowy_draft', { p_projekt_id: projektId, p_rewizja_id: rewizjaId });
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

    for (const up of data!) {
      expect(up.nazwa).toBeDefined();
      expect(Number(up.ilosc)).toBeGreaterThan(0);
      expect(Number(up.stawka)).toBeGreaterThan(0);
    }
  });

  it('umowa_pozycje_zrodla links back to kosztorys_skladowe_robocizna', async () => {
    const { data: pozycje } = await supabase
      .from('umowa_pozycje')
      .select('id')
      .eq('umowa_id', umowaId);

    for (const up of pozycje || []) {
      const { data: zrodla, error } = await supabase
        .from('umowa_pozycje_zrodla')
        .select('*')
        .eq('umowa_pozycja_id', up.id);

      expect(error).toBeNull();
      expect(zrodla!.length).toBeGreaterThanOrEqual(1);

      for (const z of zrodla!) {
        expect(z.kosztorys_pozycja_id).toBeDefined();
        expect(Number(z.ilosc)).toBeGreaterThan(0);
      }
    }
  });

  it('contract status transitions work', async () => {
    const { error: e1 } = await supabase.from('umowy').update({ status: 'wyslana' }).eq('id', umowaId);
    expect(e1).toBeNull();

    const { data: d1 } = await supabase.from('umowy').select('status').eq('id', umowaId).single();
    expect(d1!.status).toBe('wyslana');

    const { error: e2 } = await supabase.from('umowy').update({ status: 'podpisana', data_podpisania: '2026-02-01' }).eq('id', umowaId);
    expect(e2).toBeNull();

    const { data: d2 } = await supabase.from('umowy').select('status').eq('id', umowaId).single();
    expect(d2!.status).toBe('podpisana');
  });

  it('umowa_wykonanie tracks labor progress', async () => {
    const { data: pozycje } = await supabase
      .from('umowa_pozycje')
      .select('id, ilosc')
      .eq('umowa_id', umowaId)
      .order('ilosc', { ascending: false })
      .limit(1);

    const up = pozycje![0];
    const totalIlosc = Number(up.ilosc);

    await supabase.from('umowa_wykonanie').insert({ umowa_pozycja_id: up.id, data_wpisu: '2026-01-15', ilosc_wykonana: 30 });
    await supabase.from('umowa_pozycje').update({ ilosc_wykonana: 30, procent_wykonania: (30 / totalIlosc) * 100 }).eq('id', up.id);

    const { data: d1 } = await supabase.from('umowa_pozycje').select('ilosc_wykonana, procent_wykonania').eq('id', up.id).single();
    expect(Number(d1!.ilosc_wykonana)).toBe(30);
    expect(Number(d1!.procent_wykonania)).toBeCloseTo((30 / totalIlosc) * 100, 0);

    const remaining = totalIlosc - 30;
    await supabase.from('umowa_wykonanie').insert({ umowa_pozycja_id: up.id, data_wpisu: '2026-02-01', ilosc_wykonana: remaining });
    await supabase.from('umowa_pozycje').update({ ilosc_wykonana: totalIlosc, procent_wykonania: 100 }).eq('id', up.id);

    const { data: d2 } = await supabase.from('umowa_pozycje').select('ilosc_wykonana, procent_wykonania').eq('id', up.id).single();
    expect(Number(d2!.ilosc_wykonana)).toBeCloseTo(totalIlosc, 0);
    expect(Number(d2!.procent_wykonania)).toBeCloseTo(100, 0);
  });
});
