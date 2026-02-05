import { getPozycje } from '@/actions/pozycje';
import { PozycjeView } from './_components/pozycje-view';
import { type PozycjeFilters } from '@/lib/validations/pozycje';

interface PageProps {
  searchParams: Promise<{
    branza?: string;
    kategoria?: string;
    podkategoria?: string;
    search?: string;
    selected?: string;
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
  };

  const pozycje = await getPozycje(filters);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold font-mono mb-6">Pozycje</h1>
      <PozycjeView
        initialData={pozycje}
        initialFilters={filters}
        initialSelected={params.selected ?? null}
      />
    </div>
  );
}
