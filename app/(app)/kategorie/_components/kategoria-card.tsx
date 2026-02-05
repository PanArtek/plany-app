'use client'

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react';
import { useKategorieUIStore } from '@/stores/kategorie-ui-store';
import type { KategoriaNode } from '@/actions/kategorie';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KategoriaFormModal } from './modals/kategoria-form-modal';
import { DeleteConfirmModal } from './modals/delete-confirm-modal';
import { cn } from '@/lib/utils';

interface Props {
  kategoria: KategoriaNode;
  branzaId?: string;
}

export function KategoriaCard({ kategoria }: Props) {
  const { expandedIds, toggleExpanded } = useKategorieUIStore();
  const isExpanded = expandedIds.has(kategoria.id);
  const hasChildren = kategoria.children.length > 0;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addSubModalOpen, setAddSubModalOpen] = useState(false);

  // For podkategoria actions
  const [selectedPodkategoria, setSelectedPodkategoria] = useState<KategoriaNode | null>(null);
  const [editSubModalOpen, setEditSubModalOpen] = useState(false);
  const [deleteSubModalOpen, setDeleteSubModalOpen] = useState(false);

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
              setEditModalOpen(true);
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
                    setSelectedPodkategoria(podkategoria);
                    setEditSubModalOpen(true);
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
            onClick={() => setAddSubModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj podkategorię
          </Button>
        </div>
      )}

      {/* Modals for kategoria */}
      <KategoriaFormModal
        mode="edit"
        poziom={2}
        parentId={null}
        kategoria={kategoria}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <DeleteConfirmModal
        kategoria={kategoria}
        hasChildren={hasChildren}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
      />

      <KategoriaFormModal
        mode="add"
        poziom={3}
        parentId={kategoria.id}
        open={addSubModalOpen}
        onOpenChange={setAddSubModalOpen}
      />

      {/* Modals for podkategoria */}
      {selectedPodkategoria && (
        <>
          <KategoriaFormModal
            mode="edit"
            poziom={3}
            parentId={kategoria.id}
            kategoria={selectedPodkategoria}
            open={editSubModalOpen}
            onOpenChange={setEditSubModalOpen}
          />

          <DeleteConfirmModal
            kategoria={selectedPodkategoria}
            hasChildren={selectedPodkategoria.children.length > 0}
            open={deleteSubModalOpen}
            onOpenChange={setDeleteSubModalOpen}
          />
        </>
      )}
    </div>
  );
}
