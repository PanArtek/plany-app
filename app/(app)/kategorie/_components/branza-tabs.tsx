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
    <div className="flex gap-1 border-b border-border">
      {BRANZE.map(({ kod, nazwa }) => {
        const isActive = activeBranza === kod;
        const branzaData = branzeList.find(b => b.kod === kod);
        const count = branzaData?.children?.length || 0;

        return (
          <button
            key={kod}
            onClick={() => setActiveBranza(kod)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              "hover:text-primary",
              isActive
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground"
            )}
          >
            <span className="font-mono">{kod}</span>
            <span className="ml-2 text-xs text-muted-foreground">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
