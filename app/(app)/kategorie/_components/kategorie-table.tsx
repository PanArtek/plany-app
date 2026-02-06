'use client'

import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { KategoriaNode } from '@/actions/kategorie';
import { Button } from '@/components/ui/button';

interface KategorieTableProps {
  kategorie: KategoriaNode[];
  branzaKod: string;
  searchQuery: string;
  onAddPodkategoria: (parentId: string, parentKod: string, parentNazwa: string) => void;
  onEditKategoria: (kategoria: KategoriaNode, parentKod: string, parentNazwa: string) => void;
  onEditPodkategoria: (kategoria: KategoriaNode, parentKod: string, parentNazwa: string) => void;
  onDeleteKategoria: (kategoria: KategoriaNode) => void;
  onDeletePodkategoria: (kategoria: KategoriaNode, parentKategoria: KategoriaNode) => void;
}

function filterKategorie(kategorie: KategoriaNode[], query: string): KategoriaNode[] {
  if (!query.trim()) return kategorie;

  const q = query.toLowerCase();

  return kategorie
    .map((kat) => {
      const katMatches =
        kat.kod.toLowerCase().includes(q) ||
        kat.nazwa.toLowerCase().includes(q);

      const matchingChildren = kat.children.filter(
        (child) =>
          child.kod.toLowerCase().includes(q) ||
          child.nazwa.toLowerCase().includes(q)
      );

      if (katMatches) {
        // Parent matches — show it with all children
        return kat;
      }

      if (matchingChildren.length > 0) {
        // Children match — show parent with only matching children
        return { ...kat, children: matchingChildren };
      }

      return null;
    })
    .filter(Boolean) as KategoriaNode[];
}

export function KategorieTable({
  kategorie,
  branzaKod,
  searchQuery,
  onAddPodkategoria,
  onEditKategoria,
  onEditPodkategoria,
  onDeleteKategoria,
  onDeletePodkategoria,
}: KategorieTableProps) {
  const filtered = filterKategorie(kategorie, searchQuery);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Brak kategorii w tej branży
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A24]/60 backdrop-blur-sm border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[140px_1fr_60px_100px] px-4 py-3 border-b border-white/[0.08]">
        <span className="text-white/50 text-xs uppercase tracking-wider">Kod</span>
        <span className="text-white/50 text-xs uppercase tracking-wider">Nazwa</span>
        <span className="text-white/50 text-xs uppercase tracking-wider">Pod</span>
        <span className="text-white/50 text-xs uppercase tracking-wider text-right">Akcje</span>
      </div>

      {/* Rows */}
      {filtered.map((kategoria) => {
        const kategoriaFullKod = `${branzaKod}.${kategoria.kod}`;

        return (
          <div key={kategoria.id}>
            {/* Kategoria row (level 2) */}
            <div className="grid grid-cols-[140px_1fr_60px_100px] items-center px-4 py-2.5 bg-[#1A1A24]/60 border-b border-white/[0.06] hover:bg-white/5 transition-colors cursor-default">
              <span className="font-mono text-sm text-amber-500">
                {kategoria.pelny_kod || kategoriaFullKod}
              </span>
              <span className="text-white text-sm">{kategoria.nazwa}</span>
              <span>
                {kategoria.children.length > 0 && (
                  <span className="bg-white/10 text-white/50 text-xs rounded-full px-2 py-0.5">
                    {kategoria.children.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1 justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() =>
                    onAddPodkategoria(kategoria.id, kategoriaFullKod, kategoria.nazwa)
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() =>
                    onEditKategoria(kategoria, branzaKod, kategoria.nazwa)
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDeleteKategoria(kategoria)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Podkategoria rows (level 3) */}
            {kategoria.children.map((podkategoria) => {
              const podkategoriaKod = `${kategoria.kod}.${podkategoria.kod}`;

              return (
                <div
                  key={podkategoria.id}
                  className="grid grid-cols-[140px_1fr_60px_100px] items-center px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] hover:bg-white/5 transition-colors cursor-default"
                >
                  <span className="font-mono text-sm text-amber-500/70 pl-6">
                    {podkategoriaKod}
                  </span>
                  <span className="text-sm">
                    <span className="text-white/30">↳ </span>
                    <span className="text-white/70">{podkategoria.nazwa}</span>
                  </span>
                  <span />
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        onEditPodkategoria(podkategoria, kategoriaFullKod, kategoria.nazwa)
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDeletePodkategoria(podkategoria, kategoria)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
