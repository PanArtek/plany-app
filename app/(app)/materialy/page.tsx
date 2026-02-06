import { getMaterialy } from '@/actions/materialy';
import { MaterialyView } from './_components/materialy-view';
import { type MaterialyFilters } from '@/lib/validations/materialy';

const BRANZE_NAMES: Record<string, string> = {
  BUD: 'Budowlana',
  ELE: 'Elektryczna',
  SAN: 'Sanitarna',
  TEL: 'Teletechnika',
  HVC: 'HVAC',
};

interface PageProps {
  searchParams: Promise<{
    branza?: string;
    kategoria?: string;
    podkategoria?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function MaterialyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: MaterialyFilters = {
    branza: params.branza,
    kategoria: params.kategoria,
    podkategoria: params.podkategoria,
    search: params.search,
    page: params.page ? Number(params.page) : 1,
  };

  const result = await getMaterialy(filters);

  const branzaLabel = params.branza ? BRANZE_NAMES[params.branza] : undefined;

  return (
    <div className="p-6">
      <MaterialyView
        initialData={result}
        initialBranza={params.branza}
        branzaLabel={branzaLabel}
      />
    </div>
  );
}
