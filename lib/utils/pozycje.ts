// Typy dla skladowych (z Supabase)
interface SkladowaMaterial {
  cena_domyslna: number | null;
  norma_domyslna: number | null;
}

interface SkladowaRobocizna {
  cena: number | null;
}

interface PozycjaZeSkladowymi {
  cena_robocizny?: number | null;
  biblioteka_skladowe_materialy?: SkladowaMaterial[] | null;
  biblioteka_skladowe_robocizna?: SkladowaRobocizna[] | null;
}

interface CenaPozycji {
  robocizna: number;
  material: number;
  cena: number;
}

/**
 * Oblicza cene pozycji z biblioteki na podstawie skladowych
 * robocizna = SUM(skladowe_robocizna.cena) if available, else cena_robocizny (cache)
 * material = sum of (cena_domyslna * norma_domyslna) for each skladowa_material
 * cena = robocizna + material
 */
export function obliczCenePozycji(pozycja: PozycjaZeSkladowymi): CenaPozycji {
  const skladoweR = pozycja.biblioteka_skladowe_robocizna;
  const robocizna = skladoweR && skladoweR.length > 0
    ? skladoweR.reduce((sum, s) => sum + Number(s.cena ?? 0), 0)
    : (pozycja.cena_robocizny ?? 0);

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
