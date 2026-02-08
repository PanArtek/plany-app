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
  createBibliotekaSkladowaR,
  createProjekt,
  createRewizja,
  createKosztorysPozycja,
  createKosztorysSkladowaM,
  createKosztorysSkladowaR,
} from './helpers/setup';

describe('Biblioteka -> Kosztorys with calculations', () => {
  let orgId: string;
  let kpId: string; // kosztorys_pozycja id
  let profilProdukt: Record<string, unknown>;
  let plytaProdukt: Record<string, unknown>;
  let bricoman: Record<string, unknown>;
  let kowalski: Record<string, unknown>;

  beforeAll(async () => {
    const org = await createTestOrganization('koszt');
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

    bricoman = await createDostawca(orgId, { nazwa: 'Bricoman', kod: 'BRIC' });
    profilProdukt = await createProdukt(orgId, { sku: 'PRF-C50', nazwa: 'Profil C50', jednostka: 'mb' });
    plytaProdukt = await createProdukt(orgId, { sku: 'PLY-GK', nazwa: 'Płyta GK 12.5', jednostka: 'm2' });

    await createCenaDostawcy({ dostawca_id: bricoman.id as string, produkt_id: profilProdukt.id as string, cena_netto: 8.5 });
    await createCenaDostawcy({ dostawca_id: bricoman.id as string, produkt_id: plytaProdukt.id as string, cena_netto: 22.0 });

    kowalski = await createPodwykonawca(orgId, { nazwa: 'Kowalski', specjalizacja: 'gipskarton' });

    // Biblioteka templates (for reference only — kosztorys copies values)
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 1, nazwa: 'Profil C50', produkt_id: profilProdukt.id as string, dostawca_id: bricoman.id as string, cena_domyslna: 8.5, norma_domyslna: 0.9, jednostka: 'mb' });
    await createBibliotekaSkladowaM({ pozycja_biblioteka_id: pozycja.id, lp: 2, nazwa: 'Płyta GK 12.5', produkt_id: plytaProdukt.id as string, dostawca_id: bricoman.id as string, cena_domyslna: 22.0, norma_domyslna: 1.1, jednostka: 'm2' });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pozycja.id, lp: 1, opis: 'Montaż profili', podwykonawca_id: kowalski.id as string, stawka_domyslna: 15.0, norma_domyslna: 0.3, jednostka: 'rbh' });
    await createBibliotekaSkladowaR({ pozycja_biblioteka_id: pozycja.id, lp: 2, opis: 'Szpachlowanie', podwykonawca_id: kowalski.id as string, stawka_domyslna: 12.0, norma_domyslna: 0.2, jednostka: 'rbh' });

    // Projekt + Rewizja
    const projekt = await createProjekt(orgId, { nazwa: 'Biuro Centrum', powierzchnia: 1000 });
    const rewizja = await createRewizja({ projekt_id: projekt.id });

    // Kosztorys pozycja (320 m2, 30% markup)
    const kp = await createKosztorysPozycja(orgId, {
      rewizja_id: rewizja.id,
      pozycja_biblioteka_id: pozycja.id,
      lp: 1,
      nazwa: 'Ściana GK C50',
      ilosc: 320,
      jednostka: 'm2',
      narzut_percent: 30,
    });
    kpId = kp.id;

    // Copy składowe from library to kosztorys
    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kpId, lp: 1, nazwa: 'Profil C50', produkt_id: profilProdukt.id as string, dostawca_id: bricoman.id as string, cena: 8.5, norma: 0.9 });
    await createKosztorysSkladowaM({ kosztorys_pozycja_id: kpId, lp: 2, nazwa: 'Płyta GK 12.5', produkt_id: plytaProdukt.id as string, dostawca_id: bricoman.id as string, cena: 22.0, norma: 1.1 });
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kpId, lp: 1, opis: 'Montaż profili', podwykonawca_id: kowalski.id as string, stawka: 15.0, norma: 0.3 });
    await createKosztorysSkladowaR({ kosztorys_pozycja_id: kpId, lp: 2, opis: 'Szpachlowanie', podwykonawca_id: kowalski.id as string, stawka: 12.0, norma: 0.2 });
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('kosztorys_pozycje_view returns correct calculations for 320 m2', async () => {
    const { data, error } = await supabase
      .from('kosztorys_pozycje_view')
      .select('*')
      .eq('id', kpId)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // m_jednostkowy = (8.50×0.9) + (22.00×1.1) = 7.65 + 24.20 = 31.85
    expect(Number(data!.m_jednostkowy)).toBeCloseTo(31.85, 1);

    // r_jednostkowy = (15.00×0.3) + (12.00×0.2) = 4.50 + 2.40 = 6.90
    expect(Number(data!.r_jednostkowy)).toBeCloseTo(6.9, 1);

    // m_materialy = 31.85 × 320 = 10192.00
    expect(Number(data!.m_materialy)).toBeCloseTo(10192.0, 0);

    // r_robocizna = 6.90 × 320 = 2208.00
    expect(Number(data!.r_robocizna)).toBeCloseTo(2208.0, 0);

    // r_plus_m = 10192 + 2208 = 12400.00
    expect(Number(data!.r_plus_m)).toBeCloseTo(12400.0, 0);

    // narzut_wartosc = 12400 × 0.30 = 3720.00
    expect(Number(data!.narzut_wartosc)).toBeCloseTo(3720.0, 0);

    // razem = 12400 × 1.30 = 16120.00
    expect(Number(data!.razem)).toBeCloseTo(16120.0, 0);
  });

  it('changing quantity recalculates correctly', async () => {
    await supabase
      .from('kosztorys_pozycje')
      .update({ ilosc: 500 })
      .eq('id', kpId);

    const { data } = await supabase
      .from('kosztorys_pozycje_view')
      .select('*')
      .eq('id', kpId)
      .single();

    // m_materialy = 31.85 × 500 = 15925
    expect(Number(data!.m_materialy)).toBeCloseTo(15925.0, 0);

    // r_robocizna = 6.90 × 500 = 3450
    expect(Number(data!.r_robocizna)).toBeCloseTo(3450.0, 0);

    // razem = (15925 + 3450) × 1.30 = 25187.50
    expect(Number(data!.razem)).toBeCloseTo(25187.5, 0);
  });

  it('manual component adds to totals correctly', async () => {
    // Add manual material: flat 500 PLN transport
    await createKosztorysSkladowaM({
      kosztorys_pozycja_id: kpId,
      lp: 3,
      nazwa: 'Transport',
      cena: 500,
      norma: 0,
      ilosc: 1,
      is_manual: true,
    });

    const { data } = await supabase
      .from('kosztorys_pozycje_view')
      .select('*')
      .eq('id', kpId)
      .single();

    // m_materialy = 31.85×500 + 500×1 = 15925 + 500 = 16425
    expect(Number(data!.m_materialy)).toBeCloseTo(16425.0, 0);

    // r_plus_m = 16425 + 3450 = 19875
    expect(Number(data!.r_plus_m)).toBeCloseTo(19875.0, 0);

    // razem = 19875 × 1.30 = 25837.50
    expect(Number(data!.razem)).toBeCloseTo(25837.5, 0);
  });
});
