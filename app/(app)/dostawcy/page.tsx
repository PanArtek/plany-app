import { getDostawcy } from '@/actions/dostawcy';
import { DostawcyView } from './_components/dostawcy-view';
import { type DostawcyFilters } from '@/lib/validations/dostawcy';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    showInactive?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function DostawcyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: DostawcyFilters = {
    search: params.search,
    showInactive: params.showInactive === 'true',
    sort: params.sort,
    order: params.order as 'asc' | 'desc' | undefined,
    page: params.page ? Number(params.page) : 1,
  };

  const result = await getDostawcy(filters);

  return (
    <div className="p-6">
      <DostawcyView initialData={result} />
    </div>
  );
}
