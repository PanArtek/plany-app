'use client'

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KategorieTable } from './kategorie-table';
import { KategoriaFormPanel } from './panels/kategoria-form-panel';
import { DeleteConfirmPanel } from './panels/delete-confirm-panel';
import { useKategoriaModal } from '@/hooks/use-kategoria-modal';
import { deleteKategoria, type KategoriaNode } from '@/actions/kategorie';

const BRANZE = [
  { kod: 'BUD', nazwa: 'Budowlana' },
  { kod: 'ELE', nazwa: 'Elektryczna' },
  { kod: 'SAN', nazwa: 'Sanitarna' },
  { kod: 'TEL', nazwa: 'Teletechnika' },
  { kod: 'HVC', nazwa: 'HVAC' },
] as const;

const BRANZE_NAMES: Record<string, string> = {
  BUD: 'Budowlana',
  ELE: 'Elektryczna',
  SAN: 'Sanitarna',
  TEL: 'Teletechnika',
  HVC: 'HVAC',
};

interface Props {
  initialData: KategoriaNode[];
  activeBranza: string | undefined;
}

function KategorieViewContent({ initialData, activeBranza }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modal = useKategoriaModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForDelete, setSelectedForDelete] = useState<{
    kategoria: KategoriaNode;
    parentKategoria?: KategoriaNode;
  } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const currentBranza = initialData.find(b => b.kod === activeBranza);
  const kategorie = currentBranza?.children || [];

  const handleBranzaClick = (branzaKod: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (activeBranza === branzaKod) {
      params.delete('branza');
    } else {
      params.set('branza', branzaKod);
    }

    router.push(`/kategorie?${params.toString()}`);
  };

  const handleAddKategoria = () => {
    if (currentBranza) {
      modal.openAdd(currentBranza.id, currentBranza.kod, currentBranza.nazwa, 2);
    }
  };

  const handleAddPodkategoria = (parentId: string, parentKod: string, parentNazwa: string) => {
    modal.openAdd(parentId, parentKod, parentNazwa, 3);
  };

  const handleEditKategoria = (kategoria: KategoriaNode, branzaKod: string, branzaNazwa: string) => {
    modal.openEdit(kategoria, branzaKod, branzaNazwa, 2);
  };

  const handleEditPodkategoria = (kategoria: KategoriaNode, parentFullKod: string, parentNazwa: string) => {
    modal.openEdit(kategoria, parentFullKod, parentNazwa, 3);
  };

  const handleDeleteKategoria = (kategoria: KategoriaNode) => {
    setSelectedForDelete({ kategoria });
    setDeleteModalOpen(true);
  };

  const handleDeletePodkategoria = (kategoria: KategoriaNode, parentKategoria: KategoriaNode) => {
    setSelectedForDelete({ kategoria, parentKategoria });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedForDelete) return;

    const result = await deleteKategoria(selectedForDelete.kategoria.id);
    if (result.success) {
      toast.success(`Usunięto "${selectedForDelete.kategoria.nazwa}"`);
      setDeleteModalOpen(false);
      setSelectedForDelete(null);
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  // Build breadcrumb
  const breadcrumbSegments: { label: string; isLast: boolean }[] = [
    { label: 'Kategorie', isLast: !activeBranza },
  ];
  if (activeBranza && BRANZE_NAMES[activeBranza]) {
    breadcrumbSegments[0].isLast = false;
    breadcrumbSegments.push({ label: BRANZE_NAMES[activeBranza], isLast: true });
  }

  // Delete panel data
  const deleteItemKod = selectedForDelete
    ? selectedForDelete.parentKategoria
      ? `${activeBranza}.${selectedForDelete.parentKategoria.kod}.${selectedForDelete.kategoria.kod}`
      : `${activeBranza}.${selectedForDelete.kategoria.kod}`
    : '';

  const isDeleteBlocked = selectedForDelete
    ? selectedForDelete.kategoria.children.length > 0
    : false;

  const deleteBlockReason = isDeleteBlocked
    ? selectedForDelete?.parentKategoria
      ? 'Ta podkategoria ma elementy podrzędne.'
      : 'Ta kategoria ma podkategorie. Usuń najpierw podkategorie.'
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between">
        <nav className="text-sm flex items-center gap-1">
          {breadcrumbSegments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-white/30">/</span>}
              <span className={seg.isLast ? 'text-foreground' : 'text-white/50'}>
                {seg.label}
              </span>
            </span>
          ))}
        </nav>
        {activeBranza && currentBranza && (
          <Button onClick={handleAddKategoria}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj kategorię
          </Button>
        )}
      </div>

      {/* Branza tabs */}
      <div className="w-full bg-[#1A1A24]/40 backdrop-blur-sm border border-white/[0.08] rounded-lg p-1 flex gap-1">
        {BRANZE.map((b) => {
          const isActive = activeBranza === b.kod;
          return (
            <button
              key={b.kod}
              onClick={() => handleBranzaClick(b.kod)}
              className={cn(
                "flex-1 px-6 py-2.5 text-sm rounded-md transition-all",
                isActive
                  ? "bg-amber-500/15 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              {b.nazwa}
            </button>
          );
        })}
      </div>

      {/* Search input */}
      {activeBranza && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po kodzie lub nazwie..."
            className="pl-8"
          />
        </div>
      )}

      {/* Table or empty state */}
      {!activeBranza ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
          <p className="text-muted-foreground text-sm">Wybierz branżę aby wyświetlić kategorie</p>
        </div>
      ) : (
        <KategorieTable
          kategorie={kategorie}
          branzaKod={activeBranza}
          searchQuery={searchQuery}
          onAddPodkategoria={handleAddPodkategoria}
          onEditKategoria={handleEditKategoria}
          onEditPodkategoria={handleEditPodkategoria}
          onDeleteKategoria={handleDeleteKategoria}
          onDeletePodkategoria={handleDeletePodkategoria}
        />
      )}

      {/* Form panel */}
      <KategoriaFormPanel
        mode={modal.state.mode}
        poziom={modal.state.poziom}
        parentId={modal.state.parentId}
        parentPath={modal.state.parentPath}
        parentNazwa={modal.state.parentNazwa}
        suggestedKod={modal.state.suggestedKod}
        kategoria={modal.state.kategoria}
        open={modal.state.open}
        onOpenChange={modal.setOpen}
        isLoading={modal.state.isLoading}
      />

      {/* Delete confirm panel */}
      {selectedForDelete && (
        <DeleteConfirmPanel
          itemName={selectedForDelete.kategoria.nazwa}
          itemKod={deleteItemKod}
          title={selectedForDelete.parentKategoria ? 'Usuń podkategorię' : 'Usuń kategorię'}
          isBlocked={isDeleteBlocked}
          blockReason={deleteBlockReason}
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export function KategorieView(props: Props) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <KategorieViewContent {...props} />
    </Suspense>
  );
}
