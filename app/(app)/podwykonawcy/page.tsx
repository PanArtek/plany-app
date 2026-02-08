import { getPodwykonawcy } from '@/actions/podwykonawcy';
import { PodwykonawcyView } from './_components/podwykonawcy-view';
import { type PodwykonawcyFilters } from '@/lib/validations/podwykonawcy';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    specjalizacja?: string;
    showInactive?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function PodwykonawcyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: PodwykonawcyFilters = {
    search: params.search,
    specjalizacja: params.specjalizacja,
    showInactive: params.showInactive === 'true',
    sort: params.sort,
    order: params.order as 'asc' | 'desc' | undefined,
    page: params.page ? Number(params.page) : 1,
  };

  const result = await getPodwykonawcy(filters);

  return (
    <div className="p-6">
      <PodwykonawcyView initialData={result} />
    </div>
  );
}
