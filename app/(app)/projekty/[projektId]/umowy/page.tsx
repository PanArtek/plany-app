import { getUmowy } from '@/actions/umowy';
import { UmowyView } from './_components/umowy-view';

interface PageProps {
  params: Promise<{ projektId: string }>;
}

export default async function UmowyPage({ params }: PageProps) {
  const { projektId } = await params;
  const data = await getUmowy(projektId);

  return <UmowyView data={data} projektId={projektId} />;
}
