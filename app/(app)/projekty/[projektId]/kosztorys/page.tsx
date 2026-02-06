import { redirect } from 'next/navigation';
import { getKosztorysData } from '@/actions/kosztorys';
import { KosztorysView } from './_components/kosztorys-view';

interface PageProps {
  params: Promise<{ projektId: string }>;
  searchParams: Promise<{ rewizja?: string }>;
}

export default async function KosztorysPage({ params, searchParams }: PageProps) {
  const { projektId } = await params;
  const { rewizja } = await searchParams;

  const result = await getKosztorysData(projektId, rewizja);

  if (!result.success || !result.data) {
    redirect('/projekty');
  }

  return <KosztorysView data={result.data} />;
}
