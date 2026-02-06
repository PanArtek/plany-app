import { getPodwykonawcy } from '@/actions/podwykonawcy';
import { PodwykonawcyView } from './_components/podwykonawcy-view';
import { type PodwykonawcyFilters } from '@/lib/validations/podwykonawcy';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    showInactive?: string;
    page?: string;
  }>;
}

export default async function PodwykonawcyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: PodwykonawcyFilters = {
    search: params.search,
    showInactive: params.showInactive === 'true',
    page: params.page ? Number(params.page) : 1,
  };

  const result = await getPodwykonawcy(filters);

  return (
    <div className="p-6">
      <PodwykonawcyView initialData={result} />
    </div>
  );
}
