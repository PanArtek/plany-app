import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getKosztorysData } from '@/actions/kosztorys';
import { getProjekt } from '@/actions/projekty';
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
    // Check if project exists but has no revisions
    const projekt = await getProjekt(projektId);
    if (projekt) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-zinc-400">
          <h1 className="text-xl font-semibold text-zinc-200">{projekt.nazwa}</h1>
          <p>{result.error || 'Brak danych kosztorysu'}</p>
          <p className="text-sm">Utwórz pierwszą rewizję w panelu projektu, aby rozpocząć kosztorysowanie.</p>
          <Link
            href="/projekty"
            className="mt-2 px-4 py-2 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Wróć do projektów
          </Link>
        </div>
      );
    }
    redirect('/projekty');
  }

  return <KosztorysView data={result.data} />;
}
