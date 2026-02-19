'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type TypyRobociznyResult,
  type TypRobocizny,
  deleteTypRobocizny,
} from '@/actions/typy-robocizny';
import { TypyRobociznyFilters } from './typy-robocizny-filters';
import { TypyRobociznyTable } from './typy-robocizny-table';
import { TypyRobociznyPagination } from './typy-robocizny-pagination';
import { TypRobociznyFormPanel } from './panels/typ-robocizny-form-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

interface TypyRobociznyViewProps {
  initialData: TypyRobociznyResult;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
  typ: TypRobocizny | null;
}

function TypyRobociznyViewContent({ initialData }: TypyRobociznyViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
    typ: null,
  });
  const [deletePanel, setDeletePanel] = useState<{ open: boolean; typ: TypRobocizny | null }>({
    open: false,
    typ: null,
  });

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add', typ: null });
  };

  const handleRowClick = (typ: TypRobocizny) => {
    setFormPanel({ open: true, mode: 'edit', typ });
  };

  const handleDelete = (typ: TypRobocizny) => {
    setDeletePanel({ open: true, typ });
  };

  const handleConfirmDelete = async () => {
    if (!deletePanel.typ) return;

    const result = await deleteTypRobocizny(deletePanel.typ.id);
    if (result.success) {
      toast.success(`Usunięto "${deletePanel.typ.nazwa}"`);
      setDeletePanel({ open: false, typ: null });
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentSort = params.get('sort') || 'nazwa';
    const currentOrder = params.get('order') || 'asc';

    if (currentSort === newSort) {
      params.set('order', currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sort', newSort);
      params.set('order', 'asc');
    }
    params.delete('page');
    router.push(`/typy-robocizny?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <nav className="text-sm">
          <span className="text-foreground">Typy robocizny ({initialData.totalCount})</span>
        </nav>
        <Button onClick={handleAddClick} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj typ
        </Button>
      </div>

      <TypyRobociznyFilters />

      {initialData.data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 300px)' }}>
          <p className="text-muted-foreground text-sm">Brak typów robocizny</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 300px)' }}>
            <TypyRobociznyTable
              data={initialData.data}
              onRowClick={handleRowClick}
              onDelete={handleDelete}
              sort={searchParams.get('sort') || undefined}
              order={(searchParams.get('order') as 'asc' | 'desc') || undefined}
              onSortChange={handleSortChange}
            />
          </div>
          <TypyRobociznyPagination
            totalCount={initialData.totalCount}
            page={initialData.page}
            pageSize={initialData.pageSize}
          />
        </>
      )}

      <TypRobociznyFormPanel
        mode={formPanel.mode}
        typ={formPanel.mode === 'edit' && formPanel.typ ? formPanel.typ : undefined}
        open={formPanel.open}
        onOpenChange={(open) => setFormPanel((prev) => ({ ...prev, open }))}
      />

      {deletePanel.typ && (
        <DeleteConfirmPanel
          itemName={deletePanel.typ.nazwa}
          title="Usuń typ robocizny"
          warningMessage="Ta operacja jest nieodwracalna. Jeśli typ jest używany w stawkach lub pozycjach, usunięcie zostanie zablokowane."
          open={deletePanel.open}
          onOpenChange={(open) => setDeletePanel((prev) => ({ ...prev, open }))}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export function TypyRobociznyView(props: TypyRobociznyViewProps) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <TypyRobociznyViewContent {...props} />
    </Suspense>
  );
}
