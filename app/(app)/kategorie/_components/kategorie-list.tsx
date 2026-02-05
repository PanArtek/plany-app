'use client'

import type { KategoriaNode } from '@/actions/kategorie';
import { KategoriaCard } from './kategoria-card';

interface Props {
  kategorie: KategoriaNode[];
  branzaId?: string;
}

export function KategorieList({ kategorie, branzaId }: Props) {
  if (kategorie.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        Brak kategorii w tej branży
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {kategorie.map((kategoria) => (
        <KategoriaCard
          key={kategoria.id}
          kategoria={kategoria}
          branzaId={branzaId}
        />
      ))}
    </div>
  );
}
