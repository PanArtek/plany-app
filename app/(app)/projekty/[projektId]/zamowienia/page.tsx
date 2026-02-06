import { getZamowienia } from '@/actions/zamowienia';
import { ZamowieniaView } from './_components/zamowienia-view';

interface PageProps {
  params: Promise<{ projektId: string }>;
}

export default async function ZamowieniaPage({ params }: PageProps) {
  const { projektId } = await params;
  const data = await getZamowienia(projektId);

  return <ZamowieniaView data={data} projektId={projektId} />;
}
