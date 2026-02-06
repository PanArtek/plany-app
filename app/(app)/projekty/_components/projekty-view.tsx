'use client';

import { useState, Suspense } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type ProjektyResult,
  type ProjektWithCount,
  deleteProjekt,
} from '@/actions/projekty';
import { ProjektyFilters } from './projekty-filters';
import { ProjektyTable } from './projekty-table';
import { ProjektyPagination } from './projekty-pagination';
import { ProjektFormPanel } from './panels/projekt-form-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

interface ProjektyViewProps {
  initialData: ProjektyResult;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function ProjektyViewContent({ initialData }: ProjektyViewProps) {
  const [detailPanel, setDetailPanel] = useState<{ open: boolean; projektId: string | null }>({
    open: false,
    projektId: null,
  });
  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
  });
  const [deletePanel, setDeletePanel] = useState<{ open: boolean; projekt: ProjektWithCount | null }>({
    open: false,
    projekt: null,
  });

  const selectedProjekt = detailPanel.projektId
    ? initialData.data.find((p) => p.id === detailPanel.projektId)
    : null;

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleRowClick = (projekt: ProjektWithCount) => {
    setDetailPanel({ open: true, projektId: projekt.id });
  };

  const handleEdit = () => {
    if (selectedProjekt) {
      setFormPanel({ open: true, mode: 'edit' });
    }
  };

  const handleDelete = () => {
    if (selectedProjekt) {
      setDeletePanel({ open: true, projekt: selectedProjekt });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePanel.projekt) return;

    const result = await deleteProjekt(deletePanel.projekt.id);
    if (result.success) {
      toast.success(`Usunięto "${deletePanel.projekt.nazwa}"`);
      setDeletePanel({ open: false, projekt: null });
      setDetailPanel({ open: false, projektId: null });
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between">
        <nav className="text-sm">
          <span className="text-foreground">Projekty</span>
        </nav>
        <Button onClick={handleAddClick} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus className="h-4 w-4 mr-2" />
          Nowy projekt
        </Button>
      </div>

      <ProjektyFilters />

      {initialData.data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
          <p className="text-muted-foreground text-sm">Brak projektów</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 280px)' }}>
            <ProjektyTable data={initialData.data} onRowClick={handleRowClick} />
          </div>
          <ProjektyPagination
            totalCount={initialData.totalCount}
            page={initialData.page}
            pageSize={initialData.pageSize}
          />
        </>
      )}

      {/* Detail panel - placeholder until PROJ-006 */}
      {detailPanel.open && selectedProjekt && (
        <div className="hidden">
          {/* Will be replaced by ProjektDetailPanel in PROJ-006 */}
          {selectedProjekt.id}
        </div>
      )}

      {/* Form panel (add/edit) */}
      <ProjektFormPanel
        mode={formPanel.mode}
        projekt={formPanel.mode === 'edit' && selectedProjekt ? selectedProjekt : undefined}
        open={formPanel.open}
        onOpenChange={(open) => setFormPanel((prev) => ({ ...prev, open }))}
      />

      {/* Delete confirm panel */}
      {deletePanel.projekt && (
        <DeleteConfirmPanel
          itemName={deletePanel.projekt.nazwa}
          itemKod={deletePanel.projekt.slug}
          title="Usuń projekt"
          warningMessage="Ta operacja jest nieodwracalna. Projekt i wszystkie powiązane dane (rewizje, kosztorys) zostaną usunięte."
          open={deletePanel.open}
          onOpenChange={(open) => setDeletePanel((prev) => ({ ...prev, open }))}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export function ProjektyView(props: ProjektyViewProps) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <ProjektyViewContent {...props} />
    </Suspense>
  );
}
