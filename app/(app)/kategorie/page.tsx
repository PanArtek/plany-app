import { getKategorieCounts } from '@/actions/kategorie';
import { BranzeGrid } from './_components/branze-grid';

export default async function KategoriePage() {
  const counts = await getKategorieCounts();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold font-display tracking-tight mb-6">Kategorie</h1>
      <BranzeGrid counts={counts} />
    </div>
  );
}
