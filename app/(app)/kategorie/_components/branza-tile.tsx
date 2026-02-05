import Link from 'next/link';
import type { BranzaKod } from '@/stores/kategorie-ui-store';

interface Props {
  kod: BranzaKod;
  nazwa: string;
  count: number;
}

export function BranzaTile({ kod, nazwa, count }: Props) {
  return (
    <Link
      href={`/kategorie/${kod}`}
      className="bg-stone-900/50 border border-stone-700/50 rounded-xl p-8 text-center cursor-pointer hover:bg-stone-800/60 hover:border-amber-500/50 hover:scale-[1.02] transition-all duration-200"
    >
      <div className="text-4xl font-bold text-stone-100">{kod}</div>
      <div className="text-lg text-stone-400 mt-2">{nazwa}</div>
      <div className="text-sm text-stone-500 mt-1">{count} kategorii</div>
    </Link>
  );
}
