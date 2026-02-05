'use client'

import type { KategoriaNode } from '@/actions/kategorie';
import { KategoriaCard } from './kategoria-card';

interface Props {
  kategorie: KategoriaNode[];
  branzaKod: string;
  branzaNazwa: string;
  onAddPodkategoria: (parentId: string, parentKod: string, parentNazwa: string) => void;
  onEditKategoria: (kategoria: KategoriaNode, parentKod: string, parentNazwa: string) => void;
  onEditPodkategoria: (kategoria: KategoriaNode, parentKod: string, parentNazwa: string) => void;
}

export function KategorieList({
  kategorie,
  branzaKod,
  branzaNazwa,
  onAddPodkategoria,
  onEditKategoria,
  onEditPodkategoria,
}: Props) {
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
          branzaKod={branzaKod}
          branzaNazwa={branzaNazwa}
          onAddPodkategoria={onAddPodkategoria}
          onEditKategoria={onEditKategoria}
          onEditPodkategoria={onEditPodkategoria}
        />
      ))}
    </div>
  );
}
