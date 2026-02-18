import { getPodwykonawcy, getPodwykonawcyStats } from '@/actions/podwykonawcy';
import { PodwykonawcyView } from './_components/podwykonawcy-view';
import { type PodwykonawcyFilters } from '@/lib/validations/podwykonawcy';

interface PageProps {
  searchParams: Promise<{
    branza?: string;
    kategoria?: string;
    podkategoria?: string;
    search?: string;
    showInactive?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function PodwykonawcyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: PodwykonawcyFilters = {
    branza: params.branza,
    kategoria: params.kategoria,
    podkategoria: params.podkategoria,
    search: params.search,
    showInactive: params.showInactive === 'true',
    sort: params.sort,
    order: params.order as 'asc' | 'desc' | undefined,
    page: params.page ? Number(params.page) : 1,
  };

  const [result, stats] = await Promise.all([
    getPodwykonawcy(filters),
    getPodwykonawcyStats(),
  ]);

  return (
    <div className="p-6">
      <PodwykonawcyView initialData={result} stats={stats} />
    </div>
  );
}
