import { getPozycje, getCennikPricesForPozycje } from '@/actions/pozycje';
import { getKategorieForBranza, getKategorieByPoziom } from '@/actions/kategorie';
import { getAllProdukty } from '@/actions/materialy';
import { getAllDostawcy } from '@/actions/dostawcy';
import { getAllTypyRobocizny } from '@/actions/typy-robocizny';
import { getAllPodwykonawcy } from '@/actions/podwykonawcy';
import { PozycjeView } from './_components/pozycje-view';
import { type PozycjeFilters } from '@/lib/validations/pozycje';

interface PageProps {
  searchParams: Promise<{
    branza?: string;
    kategoria?: string;
    podkategoria?: string;
    search?: string;
    selected?: string;
    page?: string;
  }>;
}

export default async function PozycjePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: PozycjeFilters = {
    branza: params.branza,
    kategoria: params.kategoria,
    podkategoria: params.podkategoria,
    search: params.search,
    selected: params.selected,
    page: params.page ? Number(params.page) : 1,
  };

  const [result, produktOptions, dostawcaOptions, typRobociznyOptions, podwykonawcaOptions] = await Promise.all([
    params.branza ? getPozycje(filters) : Promise.resolve(null),
    getAllProdukty(),
    getAllDostawcy(),
    getAllTypyRobocizny(),
    getAllPodwykonawcy(),
  ]);

  // Fetch cennik prices for all loaded pozycje
  const pozycjaIds = (result?.data ?? []).map((p) => p.id);
  const cennikPrices = await getCennikPricesForPozycje(pozycjaIds);

  // Resolve category names for breadcrumb
  let kategoriaNazwa: string | undefined;
  let podkategoriaNazwa: string | undefined;

  if (params.branza && params.kategoria) {
    const kategorie = await getKategorieForBranza(params.branza);
    const kat = kategorie.find((k) => k.kod === params.kategoria);
    if (kat) {
      kategoriaNazwa = `${kat.kod} - ${kat.nazwa}`;

      if (params.podkategoria) {
        const podkategorie = await getKategorieByPoziom(3, kat.id);
        const podkat = podkategorie.find((p) => p.kod === params.podkategoria);
        if (podkat) {
          podkategoriaNazwa = `${podkat.kod} - ${podkat.nazwa}`;
        }
      }
    }
  }

  return (
    <div className="p-6">
      <PozycjeView
        initialData={result?.data ?? []}
        initialFilters={filters}
        initialSelected={params.selected ?? null}
        totalCount={result?.totalCount ?? 0}
        page={result?.page ?? 1}
        pageSize={result?.pageSize ?? 15}
        kategoriaNazwa={kategoriaNazwa}
        podkategoriaNazwa={podkategoriaNazwa}
        produktOptions={produktOptions}
        dostawcaOptions={dostawcaOptions}
        typRobociznyOptions={typRobociznyOptions}
        podwykonawcaOptions={podwykonawcaOptions}
        cennikPrices={cennikPrices}
      />
    </div>
  );
}
