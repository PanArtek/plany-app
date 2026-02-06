'use client';

import { useState, Suspense } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type DostawcyResult,
  type DostawcaWithCount,
  type CennikEntry,
  deleteDostawca,
  deleteCena,
} from '@/actions/dostawcy';
import { DostawcyFilters } from './dostawcy-filters';
import { DostawcyTable } from './dostawcy-table';
import { DostawcyPagination } from './dostawcy-pagination';
import { DostawcaDetailPanel } from './panels/dostawca-detail-panel';
import { DostawcaFormPanel } from './panels/dostawca-form-panel';
import { CennikFormPanel } from './panels/cennik-form-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

interface DostawcyViewProps {
  initialData: DostawcyResult;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function DostawcyViewContent({ initialData }: DostawcyViewProps) {
  const [detailPanel, setDetailPanel] = useState<{ open: boolean; dostawcaId: string | null }>({
    open: false,
    dostawcaId: null,
  });
  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
  });
  const [cennikFormPanel, setCennikFormPanel] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    dostawcaId: string | null;
    cena?: CennikEntry;
  }>({
    open: false,
    mode: 'add',
    dostawcaId: null,
  });
  const [deletePanel, setDeletePanel] = useState<{ open: boolean; dostawca: DostawcaWithCount | null }>({
    open: false,
    dostawca: null,
  });

  const selectedDostawca = detailPanel.dostawcaId
    ? initialData.data.find((d) => d.id === detailPanel.dostawcaId)
    : null;

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleRowClick = (dostawca: DostawcaWithCount) => {
    setDetailPanel({ open: true, dostawcaId: dostawca.id });
  };

  const handleEdit = () => {
    if (selectedDostawca) {
      setFormPanel({ open: true, mode: 'edit' });
    }
  };

  const handleDelete = () => {
    if (selectedDostawca) {
      setDeletePanel({ open: true, dostawca: selectedDostawca });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePanel.dostawca) return;

    const result = await deleteDostawca(deletePanel.dostawca.id);
    if (result.success) {
      toast.success(`Usunięto "${deletePanel.dostawca.nazwa}"`);
      setDeletePanel({ open: false, dostawca: null });
      setDetailPanel({ open: false, dostawcaId: null });
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const handleAddCena = () => {
    if (detailPanel.dostawcaId) {
      setCennikFormPanel({ open: true, mode: 'add', dostawcaId: detailPanel.dostawcaId });
    }
  };

  const handleEditCena = (cena: CennikEntry) => {
    if (detailPanel.dostawcaId) {
      setCennikFormPanel({ open: true, mode: 'edit', dostawcaId: detailPanel.dostawcaId, cena });
    }
  };

  const handleDeleteCena = async (cenaId: string) => {
    const result = await deleteCena(cenaId);
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
          <span className="text-foreground">Dostawcy</span>
        </nav>
        <Button onClick={handleAddClick} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj dostawcę
        </Button>
      </div>

      <DostawcyFilters />

      {initialData.data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
          <p className="text-muted-foreground text-sm">Brak dostawców</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 280px)' }}>
            <DostawcyTable data={initialData.data} onRowClick={handleRowClick} />
          </div>
          <DostawcyPagination
            totalCount={initialData.totalCount}
            page={initialData.page}
            pageSize={initialData.pageSize}
          />
        </>
      )}

      {/* Detail panel */}
      <DostawcaDetailPanel
        dostawcaId={detailPanel.dostawcaId}
        open={detailPanel.open}
        onOpenChange={(open) => setDetailPanel((prev) => ({ ...prev, open }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddCena={handleAddCena}
        onEditCena={handleEditCena}
        onDeleteCena={handleDeleteCena}
      />

      {/* Dostawca form panel (add/edit) */}
      <DostawcaFormPanel
        mode={formPanel.mode}
        dostawca={formPanel.mode === 'edit' && selectedDostawca ? selectedDostawca : undefined}
        open={formPanel.open}
        onOpenChange={(open) => setFormPanel((prev) => ({ ...prev, open }))}
      />

      {/* Cennik form panel (add/edit price) */}
      <CennikFormPanel
        mode={cennikFormPanel.mode}
        dostawcaId={cennikFormPanel.dostawcaId}
        cena={cennikFormPanel.cena}
        open={cennikFormPanel.open}
        onOpenChange={(open) => setCennikFormPanel((prev) => ({ ...prev, open }))}
      />

      {/* Delete confirm panel */}
      {deletePanel.dostawca && (
        <DeleteConfirmPanel
          itemName={deletePanel.dostawca.nazwa}
          itemKod={deletePanel.dostawca.kod || undefined}
          title="Usuń dostawcę"
          warningMessage="Ta operacja jest nieodwracalna. Jeśli dostawca ma produkty w cenniku, usunięcie zostanie zablokowane."
          open={deletePanel.open}
          onOpenChange={(open) => setDeletePanel((prev) => ({ ...prev, open }))}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export function DostawcyView(props: DostawcyViewProps) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <DostawcyViewContent {...props} />
    </Suspense>
  );
}
