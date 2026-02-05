import { getKategorieTree } from '@/actions/kategorie';
import { KategorieView } from './_components/kategorie-view';

export default async function KategoriePage() {
  const kategorieTree = await getKategorieTree();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold font-mono mb-6">Kategorie</h1>
      <KategorieView initialData={kategorieTree} />
    </div>
  );
}
