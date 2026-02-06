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

  const result = params.branza ? await getPozycje(filters) : null;

  return (
    <div className="p-6">
      <PozycjeView
        initialData={result?.data ?? []}
        initialFilters={filters}
        initialSelected={params.selected ?? null}
        totalCount={result?.totalCount ?? 0}
        page={result?.page ?? 1}
        pageSize={result?.pageSize ?? 15}
      />
    </div>
  );
}
