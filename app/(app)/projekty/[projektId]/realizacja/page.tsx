import { getRealizacjaStats, getRealizacjaWpisy, getZamowieniaForSelect, getUmowyForSelect } from '@/actions/realizacja';
import { RealizacjaView } from './_components/realizacja-view';

interface PageProps {
  params: Promise<{ projektId: string }>;
}

export default async function RealizacjaPage({ params }: PageProps) {
  const { projektId } = await params;
  const [stats, wpisy, zamowieniaList, umowyList] = await Promise.all([
    getRealizacjaStats(projektId),
    getRealizacjaWpisy(projektId),
    getZamowieniaForSelect(projektId),
    getUmowyForSelect(projektId),
  ]);

  return (
    <RealizacjaView
      stats={stats}
      wpisy={wpisy}
      projektId={projektId}
      zamowieniaList={zamowieniaList}
      umowyList={umowyList}
    />
  );
}
