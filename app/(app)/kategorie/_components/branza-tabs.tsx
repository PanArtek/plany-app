'use client'

import { useKategorieUIStore, type BranzaKod } from '@/stores/kategorie-ui-store';
import type { KategoriaNode } from '@/actions/kategorie';
import { cn } from '@/lib/utils';

interface Props {
  branzeList: KategoriaNode[];
}

const BRANZE: { kod: BranzaKod; nazwa: string }[] = [
  { kod: 'BUD', nazwa: 'Budowlana' },
  { kod: 'ELE', nazwa: 'Elektryczna' },
  { kod: 'SAN', nazwa: 'Sanitarna' },
  { kod: 'TEL', nazwa: 'Teletechnika' },
  { kod: 'HVC', nazwa: 'HVAC' },
];

export function BranzaTabs({ branzeList }: Props) {
  const { activeBranza, setActiveBranza } = useKategorieUIStore();

  return (
    <div className="bg-[#1A1A24]/40 backdrop-blur-sm border border-white/[0.08] rounded-lg p-1 inline-flex gap-1">
      {BRANZE.map(({ kod }) => {
        const isActive = activeBranza === kod;
        const branzaData = branzeList.find(b => b.kod === kod);
        const count = branzaData?.children?.length || 0;

        return (
          <button
            key={kod}
            onClick={() => setActiveBranza(kod)}
            className={cn(
              "px-4 py-2 font-mono text-sm rounded-md transition-all",
              isActive
                ? "bg-amber-500/15 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <span>{kod}</span>
            <span className={cn(
              "ml-2 text-xs px-1.5 py-0.5 rounded",
              isActive ? "bg-amber-500/20 text-amber-500" : "text-white/40"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
