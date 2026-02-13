import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabase,
  createTestOrganization,
  cleanupOrganization,
  createKategoriaHierarchy,
  createPozycjaBiblioteka,
  createPodwykonawca,
  createStawkaPodwykonawcy,
  updatePozycjaCenaRobocizny,
} from './helpers/setup';

describe('Pozycja <-> Robocizna <-> Podwykonawcy', () => {
  let orgId: string;
  let pozycja: Record<string, unknown>;
  let kowalski: Record<string, unknown>;

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

    await createStawkaPodwykonawcy({
      podwykonawca_id: kowalski.id as string,
      pozycja_biblioteka_id: pozycja.id as string,
      stawka: 45.0,
    });

    // Set flat labor price: 6.90 PLN/m2
    await updatePozycjaCenaRobocizny(pozycja.id as string, 6.90);
  });

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('pozycja_biblioteka has cena_robocizny set correctly', async () => {
    const { data, error } = await supabase
      .from('pozycje_biblioteka')
      .select('cena_robocizny')
      .eq('id', pozycja.id as string)
      .single();

    expect(error).toBeNull();
    expect(Number(data!.cena_robocizny)).toBeCloseTo(6.90, 2);
  });

  it('stawki_podwykonawcow links subcontractor to pozycja', async () => {
    const { data, error } = await supabase
      .from('stawki_podwykonawcow')
      .select('*')
      .eq('podwykonawca_id', kowalski.id as string)
      .eq('pozycja_biblioteka_id', pozycja.id as string);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Number(data![0].stawka)).toBeCloseTo(45.0, 2);
  });

  it('second subcontractor with different rate', async () => {
    const nowak = await createPodwykonawca(orgId, {
      nazwa: 'Ekipa GK Nowak',
      specjalizacja: 'gipskarton',
    });

    await createStawkaPodwykonawcy({
      podwykonawca_id: nowak.id,
      pozycja_biblioteka_id: pozycja.id as string,
      stawka: 42.0,
    });

    const { data } = await supabase
      .from('stawki_podwykonawcow')
      .select('*')
      .eq('pozycja_biblioteka_id', pozycja.id as string)
      .order('stawka', { ascending: false });

    expect(data).toHaveLength(2);

    const stawki = data!.map((r) => Number(r.stawka));
    expect(stawki).toContain(45.0);
    expect(stawki).toContain(42.0);
  });
});
