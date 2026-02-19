import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabase,
  createTestOrganization,
  cleanupOrganization,
  createKategoriaHierarchy,
  createPozycjaBiblioteka,
  createPodwykonawca,
  createTypRobocizny,
  createStawkaPodwykonawcy,
  createBibliotekaSkladowaR,
} from './helpers/setup';

describe('Pozycja <-> Robocizna <-> Podwykonawcy', () => {
  let orgId: string;
  let pozycja: Record<string, unknown>;
  let kowalski: Record<string, unknown>;
  let typMontaz: Record<string, unknown>;
  let typPlyt: Record<string, unknown>;
  let typSzpachl: Record<string, unknown>;

  beforeAll(async () => {
    const org = await createTestOrganization('rob');
    orgId = org.id;

    const hier = await createKategoriaHierarchy(
      orgId,
      { kod: 'BUD', nazwa: 'Budowlana' },
      { kod: '01', nazwa: 'Gipskarton' },
      { kod: '01', nazwa: 'Ściany' }
    );

    pozycja = await createPozycjaBiblioteka(orgId, {
      kategoria_id: hier.podkategoria.id,
      kod: 'BUD.01.01.001',
      nazwa: 'Ściana GK C50',
      jednostka: 'm2',
      typ: 'robocizna',
    });

    kowalski = await createPodwykonawca(orgId, {
      nazwa: 'Ekipa GK Kowalski',
      specjalizacja: 'gipskarton',
    });

    // Create labor types
    typMontaz = await createTypRobocizny(orgId, { nazwa: 'Montaż profili' });
    typPlyt = await createTypRobocizny(orgId, { nazwa: 'Montaż płyt GK' });
    typSzpachl = await createTypRobocizny(orgId, { nazwa: 'Szpachlowanie' });

    // Stawka links subcontractor to typ_robocizny
    await createStawkaPodwykonawcy({
      podwykonawca_id: kowalski.id as string,
      typ_robocizny_id: typMontaz.id as string,
      stawka: 45.0,
    });

    // biblioteka_skladowe_robocizna: cena = stawka rate from cennik
    await createBibliotekaSkladowaR({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 1,
      typ_robocizny_id: typMontaz.id as string,
      podwykonawca_id: kowalski.id as string,
      cena: 15.0,
    });
    await createBibliotekaSkladowaR({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 2,
      typ_robocizny_id: typPlyt.id as string,
      podwykonawca_id: kowalski.id as string,
      cena: 18.0,
    });
    await createBibliotekaSkladowaR({
      pozycja_biblioteka_id: pozycja.id as string,
      lp: 3,
      typ_robocizny_id: typSzpachl.id as string,
      podwykonawca_id: kowalski.id as string,
      cena: 12.0,
    });
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('pozycja has 3 labor components linked to subcontractor', async () => {
    const { data, error } = await supabase
      .from('biblioteka_skladowe_robocizna')
      .select('*')
      .eq('pozycja_biblioteka_id', pozycja.id as string)
      .order('lp');

    expect(error).toBeNull();
    expect(data).toHaveLength(3);

    for (const row of data!) {
      expect(row.podwykonawca_id).toBe(kowalski.id);
      expect(row.typ_robocizny_id).not.toBeNull();
    }

    expect(data!.map((r) => r.lp)).toEqual([1, 2, 3]);
  });

  it('stawki_podwykonawcow links subcontractor to typ_robocizny', async () => {
    const { data, error } = await supabase
      .from('stawki_podwykonawcow')
      .select('*')
      .eq('podwykonawca_id', kowalski.id as string)
      .eq('typ_robocizny_id', typMontaz.id as string);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Number(data![0].stawka)).toBeCloseTo(45.0, 2);
  });

  it('second subcontractor with different rate for same typ_robocizny', async () => {
    const nowak = await createPodwykonawca(orgId, {
      nazwa: 'Ekipa GK Nowak',
      specjalizacja: 'gipskarton',
    });

    await createStawkaPodwykonawcy({
      podwykonawca_id: nowak.id,
      typ_robocizny_id: typMontaz.id as string,
      stawka: 42.0,
    });

    const { data } = await supabase
      .from('stawki_podwykonawcow')
      .select('*')
      .eq('typ_robocizny_id', typMontaz.id as string)
      .order('stawka', { ascending: false });

    expect(data).toHaveLength(2);

    const stawki = data!.map((r) => Number(r.stawka));
    expect(stawki).toContain(45.0);
    expect(stawki).toContain(42.0);
  });
});
