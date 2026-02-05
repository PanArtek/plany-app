import { notFound } from 'next/navigation';
import { getKategorieTree } from '@/actions/kategorie';
import { KategorieView } from '../_components/kategorie-view';
import type { BranzaKod } from '@/stores/kategorie-ui-store';

const VALID_BRANZE: BranzaKod[] = ['BUD', 'ELE', 'SAN', 'TEL', 'HVC'];

interface Props {
  params: Promise<{ branza: string }>;
}

export default async function BranzaPage({ params }: Props) {
  const { branza } = await params;

  // Validate branza param
  if (!VALID_BRANZE.includes(branza as BranzaKod)) {
    notFound();
  }

  const kategorieTree = await getKategorieTree();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold font-display tracking-tight mb-6">Kategorie</h1>
      <KategorieView initialData={kategorieTree} activeBranza={branza as BranzaKod} />
    </div>
  );
}
