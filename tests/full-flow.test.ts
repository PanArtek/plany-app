import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabase,
  createTestOrganization,
  cleanupOrganization,
  createKategoria,
  createPozycjaBiblioteka,
  createDostawca,
  createProdukt,
  createCenaDostawcy,
  createPodwykonawca,
  createStawkaPodwykonawcy,
  createBibliotekaSkladowaM,
  createBibliotekaSkladowaR,
  createProjekt,
  createRewizja,
  createKosztorysPozycja,
  createKosztorysSkladowaM,
  createKosztorysSkladowaR,
} from './helpers/setup';

describe('Full end-to-end chain: library → kosztorys → accept → umowy + zamówienia → realizacja', () => {
  let orgId: string;
  let projektId: string;
  let rewizjaId: string;
  let kpScianaId: string;
  let kpMalowanieId: string;

  beforeAll(async () => {
    const org = await createTestOrganization('full');
    orgId = org.id;

    // 2 kategorie hierarchies (shared BUD + BUD.01)
    const branza = await createKategoria(orgId, { kod: 'BUD', nazwa: 'Budowlana', poziom: 1 });
    const kat01 = await createKategoria(orgId, { kod: '01', nazwa: 'Gipskarton', parent_id: branza.id, poziom: 2 });
    const podkat01 = await createKategoria(orgId, { kod: '01', nazwa: 'Ściany', parent_id: kat01.id, poziom: 3 });
    const podkat02 = await createKategoria(orgId, { kod: '02', nazwa: 'Malowanie', parent_id: kat01.id, poziom: 3 });

    // Dostawcy
    const bricoman = await createDostawca(orgId, { nazwa: 'Bricoman', kod: 'BRIC' });
    const sig = await createDostawca(orgId, { nazwa: 'SIG', kod: 'SIG' });

    // Produkty
    const profil = await createProdukt(orgId, { sku: 'PRF-C50', nazwa: 'Profil C50', jednostka: 'mb' });
    const plyta = await createProdukt(orgId, { sku: 'PLY-GK', nazwa: 'Płyta GK 12.5', jednostka: 'm2' });
    const farba = await createProdukt(orgId, { sku: 'FRB-01', nazwa: 'Farba', jednostka: 'l' });

    // Ceny
    await createCenaDostawcy({ dostawca_id: bricoman.id, produkt_id: profil.id, cena_netto: 8.5 });
    await createCenaDostawcy({ dostawca_id: bricoman.id, produkt_id: plyta.id, cena_netto: 22.0 });
    await createCenaDostawcy({ dostawca_id: sig.id, produkt_id: farba.id, cena_netto: 35.0 });

    // Podwykonawcy
    const kowalski = await createPodwykonawca(orgId, { nazwa: 'Kowalski', specjalizacja: 'gipskarton' });
    const malarz = await createPodwykonawca(orgId, { nazwa: 'Malarz', specjalizacja: 'malowanie' });

    // Pozycje biblioteczne
    const pSciana = await createPozycjaBiblioteka(orgId, {
      kategoria_id: podkat01.id,
      kod: 'BUD.01.01.001',
      nazwa: 'Ściana GK C50',
      jednostka: 'm2',
      typ: 'komplet',
    });
    const pMalowanie = await createPozycjaBiblioteka(orgId, {
      kategoria_id: podkat02.id,
      kod: 'BUD.01.02.001',
      nazwa: 'Malowanie ścian',
      jednostka: 'm2',
      typ: 'komplet',
    });

    // Stawki
    await createStawkaPodwykonawcy({ podwykonawca_id: kowalski.id, pozycja_biblioteka_id: pSciana.id, stawka: 45.0 });
    await createStawkaPodwykonawcy({ podwykonawca_id: malarz.id, pozycja_biblioteka_id: pMalowanie.id, stawka: 20.0 });

    // Biblioteka składowe — Ściana GK
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pSciana.id, lp: 1, nazwa: 'Profil C50', produkt_id: profil.id, dostawca_id: bricoman.id, cena_domyslna: 8.5, norma_domyslna: 0.9, jednostka: 'mb' });
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pSciana.id, lp: 2, nazwa: 'Płyta GK 12.5', produkt_id: plyta.id, dostawca_id: bricoman.id, cena_domyslna: 22.0, norma_domyslna: 1.1, jednostka: 'm2' });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pSciana.id, lp: 1, opis: 'Montaż profili', podwykonawca_id: kowalski.id, stawka_domyslna: 15.0, norma_domyslna: 0.3, jednostka: 'rbh' });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pSciana.id, lp: 2, opis: 'Szpachlowanie', podwykonawca_id: kowalski.id, stawka_domyslna: 12.0, norma_domyslna: 0.2, jednostka: 'rbh' });

    // Biblioteka składowe — Malowanie
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pMalowanie.id, lp: 1, nazwa: 'Farba', produkt_id: farba.id, dostawca_id: sig.id, cena_domyslna: 35.0, norma_domyslna: 0.15, jednostka: 'l' });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pMalowanie.id, lp: 1, opis: 'Malowanie', podwykonawca_id: malarz.id, stawka_domyslna: 20.0, norma_domyslna: 0.1, jednostka: 'rbh' });

    // Projekt + Rewizja
    const projekt = await createProjekt(orgId, { nazwa: 'Biuro Centrum', powierzchnia: 1000 });
    projektId = projekt.id;
    const rewizja = await createRewizja({ projekt_id: projektId });
    rewizjaId = rewizja.id;

    // Kosztorys — Ściana GK (320 m2, 30%)
    const kpSciana = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pSciana.id,
      lp: 1,
      nazwa: 'Ściana GK C50',
      ilosc: 320,
      jednostka: 'm2',
      narzut_percent: 30,
    });
    kpScianaId = kpSciana.id;

    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kpScianaId, lp: 1, nazwa: 'Profil C50', produkt_id: profil.id, dostawca_id: bricoman.id, cena: 8.5, norma: 0.9 });
    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kpScianaId, lp: 2, nazwa: 'Płyta GK 12.5', produkt_id: plyta.id, dostawca_id: bricoman.id, cena: 22.0, norma: 1.1 });
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kpScianaId, lp: 1, opis: 'Montaż profili', podwykonawca_id: kowalski.id, stawka: 15.0, norma: 0.3 });
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kpScianaId, lp: 2, opis: 'Szpachlowanie', podwykonawca_id: kowalski.id, stawka: 12.0, norma: 0.2 });

    // Kosztorys — Malowanie (500 m2, 25%)
    const kpMal = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizjaId,
      pozycja_biblioteka_id: pMalowanie.id,
      lp: 2,
      nazwa: 'Malowanie ścian',
      ilosc: 500,
      jednostka: 'm2',
      narzut_percent: 25,
    });
    kpMalowanieId = kpMal.id;

    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kpMalowanieId, lp: 1, nazwa: 'Farba', produkt_id: farba.id, dostawca_id: sig.id, cena: 35.0, norma: 0.15 });
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kpMalowanieId, lp: 1, opis: 'Malowanie', podwykonawca_id: malarz.id, stawka: 20.0, norma: 0.1 });

    // Lock + transition + generate
    await supabase.from('rewizje').update({ is_locked: true, locked_at: new Date().toISOString() }).eq('id', rewizjaId);
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'ofertowanie' });
    await supabase.rpc('change_project_status', { p_projekt_id: projektId, p_new_status: 'realizacja', p_rewizja_id: rewizjaId });
    await supabase.rpc('generate_umowy_draft', { p_projekt_id: projektId, p_rewizja_id: rewizjaId });
    await supabase.rpc('generate_zamowienia_draft', { p_projekt_id: projektId, p_rewizja_id: rewizjaId });
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('kosztorys totals are correct', async () => {
    // Ściana GK (320 m2, 30%)
    const { data: sciana } = await supabase.from('kosztorys_pozycje_view').select('*').eq('id', kpScianaId).single();
    // m_jedn = 0.9×8.50 + 1.1×22.00 = 7.65 + 24.20 = 31.85
    expect(Number(sciana!.m_jednostkowy)).toBeCloseTo(31.85, 1);
    // r_jedn = 0.3×15 + 0.2×12 = 4.50 + 2.40 = 6.90
    expect(Number(sciana!.r_jednostkowy)).toBeCloseTo(6.9, 1);
    // razem = (31.85 + 6.90) × 320 × 1.30 = 16120
    expect(Number(sciana!.razem)).toBeCloseTo(16120.0, 0);

    // Malowanie (500 m2, 25%)
    const { data: malowanie } = await supabase.from('kosztorys_pozycje_view').select('*').eq('id', kpMalowanieId).single();
    // m_jedn = 0.15 × 35 = 5.25
    expect(Number(malowanie!.m_jednostkowy)).toBeCloseTo(5.25, 1);
    // r_jedn = 0.1 × 20 = 2.00
    expect(Number(malowanie!.r_jednostkowy)).toBeCloseTo(2.0, 1);
    // razem = (5.25 + 2.00) × 500 × 1.25 = 4531.25
    expect(Number(malowanie!.razem)).toBeCloseTo(4531.25, 0);

    // rewizje_summary
    const { data: summary } = await supabase.from('rewizje_summary').select('*').eq('id', rewizjaId).single();
    expect(Number(summary!.suma_razem)).toBeCloseTo(16120.0 + 4531.25, 0);
    expect(Number(summary!.liczba_pozycji)).toBe(2);
  });

  it('umowy generated correctly per podwykonawca', async () => {
    const { data: umowy } = await supabase
      .from('umowy')
      .select('id, podwykonawca_id, podwykonawcy(nazwa)')
      .eq('projekt_id', projektId)
      .order('numer');

    expect(umowy).toHaveLength(2);

    const names = umowy!.map((u) => (u.podwykonawcy as unknown as { nazwa: string }).nazwa).sort();
    expect(names).toContain('Kowalski');
    expect(names).toContain('Malarz');

    // Verify umowa_pozycje exist for each
    for (const u of umowy!) {
      const { data: pozycje } = await supabase
        .from('umowa_pozycje')
        .select('ilosc, stawka')
        .eq('umowa_id', u.id);
      expect(pozycje!.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('zamowienia generated correctly per dostawca', async () => {
    const { data: zamowienia } = await supabase
      .from('zamowienia')
      .select('id, dostawca_id, dostawcy(nazwa)')
      .eq('projekt_id', projektId)
      .order('numer');

    expect(zamowienia).toHaveLength(2);

    const names = zamowienia!.map((z) => (z.dostawcy as unknown as { nazwa: string }).nazwa).sort();
    expect(names).toContain('Bricoman');
    expect(names).toContain('SIG');

    // Bricoman: profil 288 (0.9×320), płyta 352 (1.1×320)
    const bricoZam = zamowienia!.find((z) => (z.dostawcy as unknown as { nazwa: string }).nazwa === 'Bricoman');
    const { data: bricoPoz } = await supabase
      .from('zamowienie_pozycje')
      .select('ilosc_zamowiona, cena_jednostkowa')
      .eq('zamowienie_id', bricoZam!.id)
      .order('cena_jednostkowa');

    expect(bricoPoz).toHaveLength(2);
    expect(Number(bricoPoz![0].ilosc_zamowiona)).toBeCloseTo(288, 0); // profil
    expect(Number(bricoPoz![1].ilosc_zamowiona)).toBeCloseTo(352, 0); // płyta

    // SIG: farba 75 (0.15×500)
    const sigZam = zamowienia!.find((z) => (z.dostawcy as unknown as { nazwa: string }).nazwa === 'SIG');
    const { data: sigPoz } = await supabase
      .from('zamowienie_pozycje')
      .select('ilosc_zamowiona')
      .eq('zamowienie_id', sigZam!.id);

    expect(sigPoz).toHaveLength(1);
    expect(Number(sigPoz![0].ilosc_zamowiona)).toBeCloseTo(75, 0);
  });

  it('budget consistency across layers', async () => {
    // Kosztorys labor total (no markup)
    // Ściana: (0.3×15 + 0.2×12) × 320 = 6.90 × 320 = 2208
    // Malowanie: (0.1×20) × 500 = 2.00 × 500 = 1000
    const expectedLaborTotal = 2208 + 1000; // 3208

    // Sum umowa_pozycje values (ilosc × stawka)
    const { data: allUmowy } = await supabase.from('umowy').select('id').eq('projekt_id', projektId);
    let umowyTotal = 0;
    for (const u of allUmowy!) {
      const { data: pozycje } = await supabase.from('umowa_pozycje').select('ilosc, stawka').eq('umowa_id', u.id);
      for (const p of pozycje!) {
        umowyTotal += Number(p.ilosc) * Number(p.stawka);
      }
    }
    expect(umowyTotal).toBeCloseTo(expectedLaborTotal, 0);

    // Kosztorys material total (no markup)
    // Ściana: (0.9×8.50 + 1.1×22.00) × 320 = 31.85 × 320 = 10192
    // Malowanie: (0.15×35) × 500 = 5.25 × 500 = 2625
    const expectedMaterialTotal = 10192 + 2625; // 12817

    // Sum zamowienie_pozycje values (ilosc × cena)
    const { data: allZam } = await supabase.from('zamowienia').select('id').eq('projekt_id', projektId);
    let zamTotal = 0;
    for (const z of allZam!) {
      const { data: pozycje } = await supabase.from('zamowienie_pozycje').select('ilosc_zamowiona, cena_jednostkowa').eq('zamowienie_id', z.id);
      for (const p of pozycje!) {
        zamTotal += Number(p.ilosc_zamowiona) * Number(p.cena_jednostkowa);
      }
    }
    expect(zamTotal).toBeCloseTo(expectedMaterialTotal, 0);
  });

  it('realizacja tracks spending against budget', async () => {
    // Get a zamowienie and umowa for linking
    const { data: zamowienia } = await supabase.from('zamowienia').select('id').eq('projekt_id', projektId).limit(1);
    const { data: umowy } = await supabase.from('umowy').select('id').eq('projekt_id', projektId).limit(1);

    // Add realizacja entries
    await supabase.from('realizacja_wpisy').insert({
      organization_id: orgId,
      projekt_id: projektId,
      typ: 'material',
      kwota_netto: 5000,
      numer_faktury: 'FV/2026/F001',
      zamowienie_id: zamowienia![0].id,
    });
    await supabase.from('realizacja_wpisy').insert({
      organization_id: orgId,
      projekt_id: projektId,
      typ: 'robocizna',
      kwota_netto: 2000,
      numer_faktury: 'FV/2026/F002',
      umowa_id: umowy![0].id,
    });

    // Aggregate
    const { data: wpisy } = await supabase
      .from('realizacja_wpisy')
      .select('kwota_netto')
      .eq('projekt_id', projektId);

    const totalSpent = wpisy!.reduce((s, r) => s + Number(r.kwota_netto), 0);
    expect(totalSpent).toBeCloseTo(7000, 0);

    // Budget = 16120 + 4531.25 = 20651.25
    const budget = 20651.25;
    expect(totalSpent).toBeLessThan(budget);
  });
});
