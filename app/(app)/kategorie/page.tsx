import { getKategorieTree } from '@/actions/kategorie';
import { KategorieView } from './_components/kategorie-view';

interface PageProps {
  searchParams: Promise<{
    branza?: string;
    search?: string;
  }>;
}

export default async function KategoriePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tree = await getKategorieTree();

  return (
    <div className="p-6">
      <KategorieView initialData={tree} activeBranza={params.branza} />
    </div>
  );
}
