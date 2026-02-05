'use client'

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react';
import { useKategorieUIStore } from '@/stores/kategorie-ui-store';
import type { KategoriaNode } from '@/actions/kategorie';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteConfirmPanel } from './panels/delete-confirm-panel';
import { deleteKategoria } from '@/actions/kategorie';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  kategoria: KategoriaNode;
  branzaKod: string;
  branzaNazwa: string;
  onAddPodkategoria: (parentId: string, parentKod: string, parentNazwa: string) => void;
  onEditKategoria: (kategoria: KategoriaNode, parentKod: string, parentNazwa: string) => void;
  onEditPodkategoria: (kategoria: KategoriaNode, parentKod: string, parentNazwa: string) => void;
}

export function KategoriaCard({
  kategoria,
  branzaKod,
  branzaNazwa,
  onAddPodkategoria,
  onEditKategoria,
  onEditPodkategoria,
}: Props) {
  const { expandedIds, toggleExpanded } = useKategorieUIStore();
  const isExpanded = expandedIds.has(kategoria.id);
  const hasChildren = kategoria.children.length > 0;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPodkategoria, setSelectedPodkategoria] = useState<KategoriaNode | null>(null);
  const [deleteSubModalOpen, setDeleteSubModalOpen] = useState(false);

  const kategoriaFullKod = `${branzaKod}.${kategoria.kod}`;

  return (
    <div className="border border-border rounded-lg bg-card">
      <div
        className={cn(
          "flex items-center justify-between p-4",
          "hover:bg-muted/50 transition-colors"
        )}
      >
        <button
          onClick={() => toggleExpanded(kategoria.id)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}

          <span className="font-mono text-sm text-primary">
            {kategoria.kod}
          </span>

          <span className="text-sm">{kategoria.nazwa}</span>

          {hasChildren && (
            <Badge variant="secondary" className="text-xs ml-2">
              {kategoria.children.length}
            </Badge>
          )}
        </button>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onEditKategoria(kategoria, branzaKod, branzaNazwa);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModalOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-4 py-2 bg-muted/30">
          {kategoria.children.map((podkategoria) => (
            <div
              key={podkategoria.id}
              className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {kategoria.kod}.{podkategoria.kod}
                </span>
                <span className="text-sm">{podkategoria.nazwa}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    onEditPodkategoria(podkategoria, kategoriaFullKod, kategoria.nazwa);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedPodkategoria(podkategoria);
                    setDeleteSubModalOpen(true);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => onAddPodkategoria(kategoria.id, kategoriaFullKod, kategoria.nazwa)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj podkategorię
          </Button>
        </div>
      )}

      <DeleteConfirmPanel
        itemName={kategoria.nazwa}
        itemKod={`${branzaKod}.${kategoria.kod}`}
        title="Usuń kategorię"
        isBlocked={hasChildren}
        blockReason={hasChildren ? "Ta kategoria ma podkategorie. Usuń najpierw podkategorie." : undefined}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={async () => {
          const result = await deleteKategoria(kategoria.id);
          if (result.success) {
            toast.success(`Usunięto "${kategoria.nazwa}"`);
            setDeleteModalOpen(false);
          } else {
            toast.error(result.error || 'Błąd usuwania');
          }
        }}
      />

      {selectedPodkategoria && (
        <DeleteConfirmPanel
          itemName={selectedPodkategoria.nazwa}
          itemKod={`${branzaKod}.${kategoria.kod}.${selectedPodkategoria.kod}`}
          title="Usuń podkategorię"
          isBlocked={selectedPodkategoria.children.length > 0}
          blockReason={selectedPodkategoria.children.length > 0 ? "Ta podkategoria ma elementy podrzędne." : undefined}
          open={deleteSubModalOpen}
          onOpenChange={setDeleteSubModalOpen}
          onConfirm={async () => {
            const result = await deleteKategoria(selectedPodkategoria.id);
            if (result.success) {
              toast.success(`Usunięto "${selectedPodkategoria.nazwa}"`);
              setDeleteSubModalOpen(false);
            } else {
              toast.error(result.error || 'Błąd usuwania');
            }
          }}
        />
      )}
    </div>
  );
}
