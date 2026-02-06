import { getProjekty } from '@/actions/projekty';
import { ProjektyView } from './_components/projekty-view';
import { type ProjektyFilters } from '@/lib/validations/projekty';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ProjektyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: ProjektyFilters = {
    search: params.search,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  };

  const result = await getProjekty(filters);

  return (
    <div className="p-6">
      <ProjektyView initialData={result} />
    </div>
  );
}
