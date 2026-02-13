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
  createBibliotekaSkladowaM,
  updatePozycjaCenaRobocizny,
  createProjekt,
  createRewizja,
  createKosztorysPozycja,
  createKosztorysSkladowaM,
} from './helpers/setup';

describe('Kosztorys -> Zamówienia via generate_zamowienia_draft', () => {
  let orgId: string;
  let projektId: string;
  let rewizjaId: string;
  let bricoId: string;
  let profilId: string;
  let plytaId: string;
  let zamowienieId: string;

  beforeAll(async () => {
    const org = await createTestOrganization('zam');
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
    bricoId = bricoman.id;

    const profil = await createProdukt(orgId, { sku: 'PRF-C50', nazwa: 'Profil C50', jednostka: 'mb' });
    profilId = profil.id;
    const plyta = await createProdukt(orgId, { sku: 'PLY-GK', nazwa: 'Płyta GK 12.5', jednostka: 'm2' });
    plytaId = plyta.id;

    await createCenaDostawcy({ dostawca_id: bricoId, produkt_id: profilId, cena_netto: 8.5 });
    await createCenaDostawcy({ dostawca_id: bricoId, produkt_id: plytaId, cena_netto: 22.0 });

    // Need at least one robocizna (podwykonawca) for the test setup to be realistic
    const kowalski = await createPodwykonawca(orgId, { nazwa: 'Kowalski', specjalizacja: 'gipskarton' });

    // Library templates (materials only)
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 1, nazwa: 'Profil C50', produkt_id: profilId, dostawca_id: bricoId, cena_domyslna: 8.5, norma_domyslna: 0.9, jednostka: 'mb' });
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 2, nazwa: 'Płyta GK 12.5', produkt_id: plytaId, dostawca_id: bricoId, cena_domyslna: 22.0, norma_domyslna: 1.1, jednostka: 'm2' });

    // Flat labor price: 15.0*0.3 = 4.50
    await updatePozycjaCenaRobocizny(pozycja.id, 4.50);

    // Projekt + Rewizja
    const projekt = await createProjekt(orgId, { nazwa: 'Biuro Zam', powierzchnia: 500 });
    projektId = projekt.id;
    const rewizja = await createRewizja({ projekt_id: projektId });
    rewizjaId = rewizja.id;

    // Kosztorys (320 m2, 30%)
    const kp = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pozycja.id,
      lp: 1,
      nazwa: 'Ściana GK C50',
      ilosc: 320,
      jednostka: 'm2',
      narzut_percent: 30,
    });

    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kp.id, lp: 1, nazwa: 'Profil C50', produkt_id: profilId, dostawca_id: bricoId, cena: 8.5, norma: 0.9 });
    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kp.id, lp: 2, nazwa: 'Płyta GK 12.5', produkt_id: plytaId, dostawca_id: bricoId, cena: 22.0, norma: 1.1 });

    // Set flat labor price on kosztorys_pozycje: 4.50
    await supabase.from('kosztorys_pozycje').update({ cena_robocizny: 4.50 }).eq('id', kp.id);

    // Lock + accept
    await supabase.from('rewizje').update({ is_locked: true, locked_at: new Date().toISOString() }).eq('id', rewizjaId);
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'ofertowanie' });
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'realizacja', p_rewizja_id: rewizjaId });

    // Generate zamówienia
    await supabase.rpc('generate_zamowienia_draft', { p_projekt_id: projektId, p_rewizja_id: rewizjaId });
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('generate_zamowienia_draft creates PO for supplier', async () => {
    const { data, error } = await supabase
      .from('zamowienia')
      .select('*')
      .eq('projekt_id', projektId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const zam = data![0];
    zamowienieId = zam.id;
    expect(zam.dostawca_id).toBe(bricoId);
    expect(zam.status).toBe('draft');
  });

  it('zamowienie_pozycje contain materials from kosztorys', async () => {
    const { data, error } = await supabase
      .from('zamowienie_pozycje')
      .select('*')
      .eq('zamowienie_id', zamowienieId)
      .order('cena_jednostkowa');

    expect(error).toBeNull();
    // RPC groups by (produkt_id, cena), so 2 rows
    expect(data).toHaveLength(2);

    // Profil: ilosc = 0.9 × 320 = 288, cena = 8.50
    const profilRow = data!.find((r) => Number(r.cena_jednostkowa) === 8.5);
    expect(profilRow).toBeDefined();
    expect(Number(profilRow!.ilosc_zamowiona)).toBeCloseTo(288, 0);

    // Płyta: ilosc = 1.1 × 320 = 352, cena = 22.00
    const plytaRow = data!.find((r) => Number(r.cena_jednostkowa) === 22.0);
    expect(plytaRow).toBeDefined();
    expect(Number(plytaRow!.ilosc_zamowiona)).toBeCloseTo(352, 0);
  });

  it('zamowienie_pozycje_zrodla links back to kosztorys_skladowe_materialy', async () => {
    const { data: pozycje } = await supabase
      .from('zamowienie_pozycje')
      .select('id')
      .eq('zamowienie_id', zamowienieId);

    for (const zp of pozycje || []) {
      const { data: zrodla, error } = await supabase
        .from('zamowienie_pozycje_zrodla')
        .select('*')
        .eq('zamowienie_pozycja_id', zp.id);

      expect(error).toBeNull();
      expect(zrodla!.length).toBeGreaterThanOrEqual(1);

      for (const z of zrodla!) {
        expect(z.kosztorys_skladowa_m_id).toBeDefined();
        expect(Number(z.ilosc)).toBeGreaterThan(0);
      }
    }
  });

  it('partial delivery updates quantities', async () => {
    // draft → wyslane
    await supabase.from('zamowienia').update({ status: 'wyslane' }).eq('id', zamowienieId);

    // Get profil pozycja (cena = 8.50)
    const { data: pozycje } = await supabase
      .from('zamowienie_pozycje')
      .select('id, ilosc_zamowiona, cena_jednostkowa')
      .eq('zamowienie_id', zamowienieId)
      .order('cena_jednostkowa');

    const profilPoz = pozycje![0]; // lower price = profil

    // Create delivery
    const { data: dostawa } = await supabase
      .from('zamowienie_dostawy')
      .insert({ zamowienie_id: zamowienieId, data_dostawy: '2026-02-01', numer_wz: 'WZ/001' })
      .select('id')
      .single();

    await supabase.from('zamowienie_dostawy_pozycje').insert({
      zamowienie_dostawa_id: dostawa!.id,
      zamowienie_pozycja_id: profilPoz.id,
      ilosc_dostarczona: 100,
    });

    // Update delivered quantity
    await supabase.from('zamowienie_pozycje').update({ ilosc_dostarczona: 100 }).eq('id', profilPoz.id);

    const { data: updated } = await supabase.from('zamowienie_pozycje').select('ilosc_dostarczona').eq('id', profilPoz.id).single();
    expect(Number(updated!.ilosc_dostarczona)).toBe(100);

    // wyslane → czesciowo
    await supabase.from('zamowienia').update({ status: 'czesciowo' }).eq('id', zamowienieId);

    const { data: zamStatus } = await supabase.from('zamowienia').select('status').eq('id', zamowienieId).single();
    expect(zamStatus!.status).toBe('czesciowo');
  });

  it('full delivery completes PO', async () => {
    const { data: pozycje } = await supabase
      .from('zamowienie_pozycje')
      .select('id, ilosc_zamowiona, ilosc_dostarczona, cena_jednostkowa')
      .eq('zamowienie_id', zamowienieId)
      .order('cena_jednostkowa');

    // Deliver remaining for both
    const { data: dostawa } = await supabase
      .from('zamowienie_dostawy')
      .insert({ zamowienie_id: zamowienieId, data_dostawy: '2026-02-10', numer_wz: 'WZ/002' })
      .select('id')
      .single();

    for (const p of pozycje!) {
      const remaining = Number(p.ilosc_zamowiona) - Number(p.ilosc_dostarczona || 0);
      if (remaining > 0) {
        await supabase.from('zamowienie_dostawy_pozycje').insert({
          zamowienie_dostawa_id: dostawa!.id,
          zamowienie_pozycja_id: p.id,
          ilosc_dostarczona: remaining,
        });

        await supabase
          .from('zamowienie_pozycje')
          .update({ ilosc_dostarczona: Number(p.ilosc_zamowiona) })
          .eq('id', p.id);
      }
    }

    // czesciowo → dostarczone
    await supabase.from('zamowienia').update({ status: 'dostarczone' }).eq('id', zamowienieId);

    const { data: zamFinal } = await supabase.from('zamowienia').select('status').eq('id', zamowienieId).single();
    expect(zamFinal!.status).toBe('dostarczone');

    // Verify all quantities match
    const { data: finalPoz } = await supabase
      .from('zamowienie_pozycje')
      .select('ilosc_zamowiona, ilosc_dostarczona')
      .eq('zamowienie_id', zamowienieId);

    for (const p of finalPoz!) {
      expect(Number(p.ilosc_dostarczona)).toBeCloseTo(Number(p.ilosc_zamowiona), 0);
    }
  });
});
