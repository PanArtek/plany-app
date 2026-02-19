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
  createBibliotekaSkladowaM,
} from './helpers/setup';

describe('Pozycja <-> Materiały <-> Dostawcy', () => {
  let orgId: string;
  let pozycja: Record<string, unknown>;
  let bricoman: Record<string, unknown>;
  let profil: Record<string, unknown>;
  let plyta: Record<string, unknown>;
  let wkrety: Record<string, unknown>;
  let tasma: Record<string, unknown>;

  beforeAll(async () => {
    const org = await createTestOrganization('mat');
    orgId = org.id;

    // Kategoria hierarchy: BUD → BUD.01 → BUD.01.01
    const hier = await createKategoriaHierarchy(
      orgId,
      { kod: 'BUD', nazwa: 'Budowlana' },
      { kod: '01', nazwa: 'Gipskarton' },
      { kod: '01', nazwa: 'Ściany' }
    );

    // Pozycja biblioteczna
    pozycja = await createPozycjaBiblioteka(orgId, {
      kategoria_id: hier.podkategoria.id,
      kod: 'BUD.01.01.001',
      nazwa: 'Ściana GK C50',
      jednostka: 'm2',
      typ: 'material',
    });

    // Dostawca
    bricoman = await createDostawca(orgId, { nazwa: 'Bricoman', kod: 'BRIC' });

    // 4 produkty
    profil = await createProdukt(orgId, {
      sku: 'PRF-C50',
      nazwa: 'Profil C50',
      jednostka: 'mb',
    });
    plyta = await createProdukt(orgId, {
      sku: 'PLY-GK125',
      nazwa: 'Płyta GK 12.5',
      jednostka: 'm2',
    });
    wkrety = await createProdukt(orgId, {
      sku: 'WKR-GK35',
      nazwa: 'Wkręty GK',
      jednostka: 'op',
    });
    tasma = await createProdukt(orgId, {
      sku: 'TSM-PAP',
      nazwa: 'Taśma papierowa',
      jednostka: 'mb',
    });

    // Ceny dostawców
    await createCenaDostawcy({ dostawca_id: bricoman.id as string, produkt_id: profil.id as string, cena_netto: 8.5 });
    await createCenaDostawcy({ dostawca_id: bricoman.id as string, produkt_id: plyta.id as string, cena_netto: 22.0 });
    await createCenaDostawcy({ dostawca_id: bricoman.id as string, produkt_id: wkrety.id as string, cena_netto: 15.0 });
    await createCenaDostawcy({ dostawca_id: bricoman.id as string, produkt_id: tasma.id as string, cena_netto: 3.5 });

    // 4 biblioteka_skladowe_materialy (no nazwa, no cena_domyslna — new schema)
    await createBibliotekaSkladowaM({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 1,
      produkt_id: profil.id as string,
      dostawca_id: bricoman.id as string,
      norma_domyslna: 0.9,
      jednostka: 'mb',
    });
    await createBibliotekaSkladowaM({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 2,
      produkt_id: plyta.id as string,
      dostawca_id: bricoman.id as string,
      norma_domyslna: 1.1,
      jednostka: 'm2',
    });
    await createBibliotekaSkladowaM({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 3,
      produkt_id: wkrety.id as string,
      dostawca_id: bricoman.id as string,
      norma_domyslna: 0.05,
      jednostka: 'op',
    });
    await createBibliotekaSkladowaM({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 4,
      produkt_id: tasma.id as string,
      dostawca_id: bricoman.id as string,
      norma_domyslna: 0.8,
      jednostka: 'mb',
    });
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('pozycja has 4 material components linked to products and supplier', async () => {
    const { data, error } = await supabase
      .from('biblioteka_skladowe_materialy')
      .select('*')
      .eq('pozycja_biblioteka_id', pozycja.id as string)
      .order('lp');

    expect(error).toBeNull();
    expect(data).toHaveLength(4);

    for (const row of data!) {
      expect(row.produkt_id).not.toBeNull();
      expect(row.dostawca_id).toBe(bricoman.id);
    }

    const lps = data!.map((r) => r.lp);
    expect(lps).toEqual([1, 2, 3, 4]);
  });

  it('supplier price change is visible through ceny_dostawcow', async () => {
    // Update price for profil C50
    await supabase
      .from('ceny_dostawcow')
      .update({ cena_netto: 9.5 })
      .eq('dostawca_id', bricoman.id as string)
      .eq('produkt_id', profil.id as string);

    const { data } = await supabase
      .from('ceny_dostawcow')
      .select('cena_netto')
      .eq('dostawca_id', bricoman.id as string)
      .eq('produkt_id', profil.id as string)
      .single();

    expect(Number(data!.cena_netto)).toBeCloseTo(9.5, 2);

    // Prices now come from cennik (ceny_dostawcow), not stored on the skladowa
    // Verify cennik still has the original product linked
    const { data: skladowa } = await supabase
      .from('biblioteka_skladowe_materialy')
      .select('produkt_id, dostawca_id')
      .eq('pozycja_biblioteka_id', pozycja.id as string)
      .eq('lp', 1)
      .single();

    expect(skladowa!.produkt_id).toBe(profil.id);
    expect(skladowa!.dostawca_id).toBe(bricoman.id);
  });

  it('second supplier with different prices', async () => {
    // Create SIG
    const sig = await createDostawca(orgId, { nazwa: 'SIG', kod: 'SIG' });

    // Ceny for same 4 products
    await createCenaDostawcy({ dostawca_id: sig.id, produkt_id: profil.id as string, cena_netto: 9.0 });
    await createCenaDostawcy({ dostawca_id: sig.id, produkt_id: plyta.id as string, cena_netto: 24.0 });
    await createCenaDostawcy({ dostawca_id: sig.id, produkt_id: wkrety.id as string, cena_netto: 14.0 });
    await createCenaDostawcy({ dostawca_id: sig.id, produkt_id: tasma.id as string, cena_netto: 4.0 });

    // Profil has 2 suppliers now
    const { data: profilCeny } = await supabase
      .from('ceny_dostawcow')
      .select('*')
      .eq('produkt_id', profil.id as string);

    expect(profilCeny).toHaveLength(2);

    // SIG has 4 products
    const { data: sigCeny } = await supabase
      .from('ceny_dostawcow')
      .select('*')
      .eq('dostawca_id', sig.id);

    expect(sigCeny).toHaveLength(4);
  });
});
