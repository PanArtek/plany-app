// Typy dla składowych (z Supabase - new schema)
interface SkladowaRobocizna {
  cena: number;
}

interface SkladowaMaterial {
  norma_domyslna: number | null;
  // cena_cennik comes from joined ceny_dostawcow — not available in simple calc
  // For library positions, we store norma_domyslna but prices come from cennik
}

interface PozycjaZeSkladowymi {
  biblioteka_skladowe_robocizna?: SkladowaRobocizna[] | null;
  biblioteka_skladowe_materialy?: SkladowaMaterial[] | null;
}

interface CenaPozycji {
  robocizna: number;
  material: number;
  cena: number;
}

/**
 * Oblicza cenę pozycji z biblioteki na podstawie składowych
 * robocizna = sum of cena for each skladowa_robocizna
 * material = sum of norma_domyslna for each skladowa_material (price info requires cennik lookup)
 * cena = robocizna + material
 *
 * Note: In the new schema, material prices come from ceny_dostawcow (cennik).
 * This function provides a basic sum. For accurate pricing, use server-side
 * calculation that joins with ceny_dostawcow and stawki_podwykonawcow.
 */
export function obliczCenePozycji(pozycja: PozycjaZeSkladowymi): CenaPozycji {
  const robocizna = (pozycja.biblioteka_skladowe_robocizna ?? []).reduce((sum, s) => {
    return sum + (s.cena ?? 0);
  }, 0);

  // Material costs in new schema require cennik lookup
  // norma_domyslna alone doesn't give us a price
  const material = 0;

  return {
    robocizna,
    material,
    cena: robocizna + material,
  };
}
