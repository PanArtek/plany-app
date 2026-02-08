import { getRealizacjaStats, getRealizacjaWpisy, getZamowieniaForSelect, getUmowyForSelect, getZamowieniaChecklista, getUmowyChecklista } from '@/actions/realizacja';
import { RealizacjaView } from './_components/realizacja-view';

interface PageProps {
  params: Promise<{ projektId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function RealizacjaPage({ params, searchParams }: PageProps) {
  const { projektId } = await params;
  const { tab } = await searchParams;
  const [stats, wpisy, zamowieniaList, umowyList, zamowieniaChecklista, umowyChecklista] = await Promise.all([
    getRealizacjaStats(projektId),
    getRealizacjaWpisy(projektId),
    getZamowieniaForSelect(projektId),
    getUmowyForSelect(projektId),
    getZamowieniaChecklista(projektId),
    getUmowyChecklista(projektId),
  ]);

  return (
    <RealizacjaView
      stats={stats}
      wpisy={wpisy}
      projektId={projektId}
      zamowieniaList={zamowieniaList}
      umowyList={umowyList}
      tab={tab || 'checklista'}
      zamowieniaChecklista={zamowieniaChecklista}
      umowyChecklista={umowyChecklista}
    />
  );
}
