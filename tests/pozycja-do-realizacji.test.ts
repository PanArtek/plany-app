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

describe('Umowy/Zamówienia -> Realizacja wpisy', () => {
  let orgId: string;
  let projektId: string;
  let umowaId: string;
  let zamowienieId: string;

  beforeAll(async () => {
    const org = await createTestOrganization('real');
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
    await createStawkaPodwykonawcy({ podwykonawca_id: kowalski.id, pozycja_biblioteka_id: pozycja.id, stawka: 45.0 });

    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 1, nazwa: 'Profil C50', produkt_id: profil.id, dostawca_id: bricoman.id, cena_domyslna: 8.5, norma_domyslna: 0.9, jednostka: 'mb' });

    // Flat labor price: 15.0*0.3 = 4.50
    await updatePozycjaCenaRobocizny(pozycja.id, 4.50);

    const projekt = await createProjekt(orgId, { nazwa: 'Biuro Real', powierzchnia: 500 });
    projektId = projekt.id;
    const rewizja = await createRewizja({ projekt_id: projektId });

    const kp = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizja.id,
      pozycja_biblioteka_id: pozycja.id,
      lp: 1,
      nazwa: 'Ściana GK C50',
      ilosc: 320,
      jednostka: 'm2',
      narzut_percent: 30,
    });

    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kp.id, lp: 1, nazwa: 'Profil C50', produkt_id: profil.id, dostawca_id: bricoman.id, cena: 8.5, norma: 0.9 });

    // Set flat labor price + podwykonawca on kosztorys_pozycje
    await supabase.from('kosztorys_pozycje').update({
      cena_robocizny: 4.50,
      cena_robocizny_zrodlo: 'podwykonawca',
      podwykonawca_id: kowalski.id,
    }).eq('id', kp.id);

    // Lock + accept + generate
    await supabase.from('rewizje').update({ is_locked: true, locked_at: new Date().toISOString() }).eq('id', rewizja.id);
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'ofertowanie' });
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'realizacja', p_rewizja_id: rewizja.id });

    await supabase.rpc('generate_umowy_draft', { p_projekt_id: projektId, p_rewizja_id: rewizja.id });
    await supabase.rpc('generate_zamowienia_draft', { p_projekt_id: projektId, p_rewizja_id: rewizja.id });

    // Get generated IDs
    const { data: umowy } = await supabase.from('umowy').select('id').eq('projekt_id', projektId).limit(1);
    umowaId = umowy![0].id;

    const { data: zamowienia } = await supabase.from('zamowienia').select('id').eq('projekt_id', projektId).limit(1);
    zamowienieId = zamowienia![0].id;

    // Sign umowa + send zamówienie
    await supabase.from('umowy').update({ status: 'wyslana' }).eq('id', umowaId);
    await supabase.from('umowy').update({ status: 'podpisana', data_podpisania: '2026-02-01' }).eq('id', umowaId);
    await supabase.from('zamowienia').update({ status: 'wyslane' }).eq('id', zamowienieId);
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('create material realization entry linked to zamowienie', async () => {
    const { data, error } = await supabase
      .from('realizacja_wpisy')
      .insert({
        organization_id: orgId,
        projekt_id: projektId,
        typ: 'material',
        kwota_netto: 5000.0,
        numer_faktury: 'FV/2026/001',
        data_faktury: '2026-02-01',
        oplacone: false,
        zamowienie_id: zamowienieId,
        opis: 'Faktura za materiały - profil C50',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.zamowienie_id).toBe(zamowienieId);
    expect(data!.umowa_id).toBeNull();
    expect(data!.typ).toBe('material');
    expect(Number(data!.kwota_netto)).toBe(5000);
  });

  it('create labor realization entry linked to umowa', async () => {
    const { data, error } = await supabase
      .from('realizacja_wpisy')
      .insert({
        organization_id: orgId,
        projekt_id: projektId,
        typ: 'robocizna',
        kwota_netto: 3000.0,
        numer_faktury: 'FV/2026/002',
        data_faktury: '2026-02-05',
        oplacone: false,
        umowa_id: umowaId,
        opis: 'Faktura za montaż - Kowalski',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.umowa_id).toBe(umowaId);
    expect(data!.zamowienie_id).toBeNull();
    expect(data!.typ).toBe('robocizna');
    expect(Number(data!.kwota_netto)).toBe(3000);
  });

  it('create other-type realization entry', async () => {
    const { data, error } = await supabase
      .from('realizacja_wpisy')
      .insert({
        organization_id: orgId,
        projekt_id: projektId,
        typ: 'inny',
        kwota_netto: 800.0,
        numer_faktury: 'FV/2026/003',
        opis: 'Transport materiałów',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.zamowienie_id).toBeNull();
    expect(data!.umowa_id).toBeNull();
    expect(data!.typ).toBe('inny');
  });

  it('mark entries as paid', async () => {
    await supabase
      .from('realizacja_wpisy')
      .update({ oplacone: true })
      .eq('projekt_id', projektId);

    const { data } = await supabase
      .from('realizacja_wpisy')
      .select('oplacone')
      .eq('projekt_id', projektId);

    for (const row of data!) {
      expect(row.oplacone).toBe(true);
    }
  });

  it('realizacja totals per project', async () => {
    const { data } = await supabase
      .from('realizacja_wpisy')
      .select('typ, kwota_netto, oplacone')
      .eq('projekt_id', projektId);

    const total = data!.reduce((s, r) => s + Number(r.kwota_netto), 0);
    expect(total).toBeCloseTo(8800, 0);

    const matTotal = data!.filter((r) => r.typ === 'material').reduce((s, r) => s + Number(r.kwota_netto), 0);
    expect(matTotal).toBeCloseTo(5000, 0);

    const robTotal = data!.filter((r) => r.typ === 'robocizna').reduce((s, r) => s + Number(r.kwota_netto), 0);
    expect(robTotal).toBeCloseTo(3000, 0);

    const paidCount = data!.filter((r) => r.oplacone === true).length;
    expect(paidCount).toBe(3);
  });
});
