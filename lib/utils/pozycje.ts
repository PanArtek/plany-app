// Typy dla składowych (z Supabase)
interface SkladowaRobocizna {
  stawka_domyslna: number | null;
  norma_domyslna: number | null;
}

interface SkladowaMaterial {
  cena_domyslna: number | null;
  norma_domyslna: number | null;
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
 * robocizna = sum of (stawka_domyslna * norma_domyslna) for each skladowa_robocizna
 * material = sum of (cena_domyslna * norma_domyslna) for each skladowa_material
 * cena = robocizna + material
 */
export function obliczCenePozycji(pozycja: PozycjaZeSkladowymi): CenaPozycji {
  const robocizna = (pozycja.biblioteka_skladowe_robocizna ?? []).reduce((sum, s) => {
    const stawka = s.stawka_domyslna ?? 0;
    const norma = s.norma_domyslna ?? 0;
    return sum + stawka * norma;
  }, 0);

  const material = (pozycja.biblioteka_skladowe_materialy ?? []).reduce((sum, s) => {
    const cena = s.cena_domyslna ?? 0;
    const norma = s.norma_domyslna ?? 0;
    return sum + cena * norma;
  }, 0);

  return {
    robocizna,
    material,
    cena: robocizna + material,
  };
}
