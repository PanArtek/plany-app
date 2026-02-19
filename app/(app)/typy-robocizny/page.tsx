import { getTypyRobocizny } from '@/actions/typy-robocizny';
import { TypyRobociznyView } from './_components/typy-robocizny-view';
import { type TypyRobociznyFilters } from '@/lib/validations/typy-robocizny';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    showInactive?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function TypyRobociznyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: TypyRobociznyFilters = {
    search: params.search,
    showInactive: params.showInactive === 'true',
    sort: params.sort,
    order: params.order as 'asc' | 'desc' | undefined,
    page: params.page ? Number(params.page) : 1,
  };

  const result = await getTypyRobocizny(filters);

  return (
    <div className="p-6">
      <TypyRobociznyView initialData={result} />
    </div>
  );
}
