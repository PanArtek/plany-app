'use client';

import { useState, Suspense } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type PodwykonawcyResult,
  type PodwykonawcaWithCount,
  type StawkaEntry,
  deletePodwykonawca,
  deleteStawka,
} from '@/actions/podwykonawcy';
import { PodwykonawcyFilters } from './podwykonawcy-filters';
import { PodwykonawcyTable } from './podwykonawcy-table';
import { PodwykonawcyPagination } from './podwykonawcy-pagination';
import { PodwykonawcaDetailPanel } from './panels/podwykonawca-detail-panel';
import { PodwykonawcaFormPanel } from './panels/podwykonawca-form-panel';
import { StawkaFormPanel } from './panels/stawka-form-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

interface PodwykonawcyViewProps {
  initialData: PodwykonawcyResult;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function PodwykonawcyViewContent({ initialData }: PodwykonawcyViewProps) {
  const [detailPanel, setDetailPanel] = useState<{ open: boolean; podwykonawcaId: string | null }>({
    open: false,
    podwykonawcaId: null,
  });
  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
  });
  const [stawkaFormPanel, setStawkaFormPanel] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    podwykonawcaId: string | null;
    stawka?: StawkaEntry;
  }>({
    open: false,
    mode: 'add',
    podwykonawcaId: null,
  });
  const [deletePanel, setDeletePanel] = useState<{ open: boolean; podwykonawca: PodwykonawcaWithCount | null }>({
    open: false,
    podwykonawca: null,
  });

  const selectedPodwykonawca = detailPanel.podwykonawcaId
    ? initialData.data.find((d) => d.id === detailPanel.podwykonawcaId)
    : null;

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleRowClick = (podwykonawca: PodwykonawcaWithCount) => {
    setDetailPanel({ open: true, podwykonawcaId: podwykonawca.id });
  };

  const handleEdit = () => {
    if (selectedPodwykonawca) {
      setFormPanel({ open: true, mode: 'edit' });
    }
  };

  const handleDelete = () => {
    if (selectedPodwykonawca) {
      setDeletePanel({ open: true, podwykonawca: selectedPodwykonawca });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePanel.podwykonawca) return;

    const result = await deletePodwykonawca(deletePanel.podwykonawca.id);
    if (result.success) {
      toast.success(`Usunięto "${deletePanel.podwykonawca.nazwa}"`);
      setDeletePanel({ open: false, podwykonawca: null });
      setDetailPanel({ open: false, podwykonawcaId: null });
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const handleAddStawka = () => {
    if (detailPanel.podwykonawcaId) {
      setStawkaFormPanel({ open: true, mode: 'add', podwykonawcaId: detailPanel.podwykonawcaId });
    }
  };

  const handleEditStawka = (stawka: StawkaEntry) => {
    if (detailPanel.podwykonawcaId) {
      setStawkaFormPanel({ open: true, mode: 'edit', podwykonawcaId: detailPanel.podwykonawcaId, stawka });
    }
  };

  const handleDeleteStawka = async (stawkaId: string) => {
    const result = await deleteStawka(stawkaId);
    if (result.success) {
      toast.success('Usunięto pozycję z cennika');
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between">
        <nav className="text-sm">
          <span className="text-foreground">Podwykonawcy</span>
        </nav>
        <Button onClick={handleAddClick} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj podwykonawcę
        </Button>
      </div>

      <PodwykonawcyFilters />

      {initialData.data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
          <p className="text-muted-foreground text-sm">Brak podwykonawców</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 280px)' }}>
            <PodwykonawcyTable data={initialData.data} onRowClick={handleRowClick} />
          </div>
          <PodwykonawcyPagination
            totalCount={initialData.totalCount}
            page={initialData.page}
            pageSize={initialData.pageSize}
          />
        </>
      )}

      {/* Detail panel */}
      <PodwykonawcaDetailPanel
        podwykonawcaId={detailPanel.podwykonawcaId}
        open={detailPanel.open}
        onOpenChange={(open) => setDetailPanel((prev) => ({ ...prev, open }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddStawka={handleAddStawka}
        onEditStawka={handleEditStawka}
        onDeleteStawka={handleDeleteStawka}
      />

      {/* Podwykonawca form panel (add/edit) */}
      <PodwykonawcaFormPanel
        mode={formPanel.mode}
        podwykonawca={formPanel.mode === 'edit' && selectedPodwykonawca ? selectedPodwykonawca : undefined}
        open={formPanel.open}
        onOpenChange={(open) => setFormPanel((prev) => ({ ...prev, open }))}
      />

      {/* Stawka form panel (add/edit rate) */}
      <StawkaFormPanel
        mode={stawkaFormPanel.mode}
        podwykonawcaId={stawkaFormPanel.podwykonawcaId}
        stawka={stawkaFormPanel.stawka}
        open={stawkaFormPanel.open}
        onOpenChange={(open) => setStawkaFormPanel((prev) => ({ ...prev, open }))}
      />

      {/* Delete confirm panel */}
      {deletePanel.podwykonawca && (
        <DeleteConfirmPanel
          itemName={deletePanel.podwykonawca.nazwa}
          title="Usuń podwykonawcę"
          warningMessage="Ta operacja jest nieodwracalna. Jeśli podwykonawca ma stawki w cenniku lub jest używany w pozycjach, usunięcie zostanie zablokowane."
          open={deletePanel.open}
          onOpenChange={(open) => setDeletePanel((prev) => ({ ...prev, open }))}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export function PodwykonawcyView(props: PodwykonawcyViewProps) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <PodwykonawcyViewContent {...props} />
    </Suspense>
  );
}
