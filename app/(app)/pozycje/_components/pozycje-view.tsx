'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type Pozycja } from '@/actions/pozycje';
import { type PozycjeFilters } from '@/lib/validations/pozycje';
import { PozycjeFilters as FiltersComponent } from './pozycje-filters';
import { PozycjeTable } from './pozycje-table';
import { PozycjaDetailPanel } from './pozycja-detail-panel';
import { PozycjaFormModal } from './modals/pozycja-form-modal';
import { DeletePozycjaModal } from './modals/delete-pozycja-modal';

interface PozycjeViewProps {
  initialData: Pozycja[];
  initialFilters: PozycjeFilters;
  initialSelected: string | null;
}

interface FormModalState {
  open: boolean;
  mode: 'add' | 'edit';
}

function PozycjeViewContent({ initialData, initialFilters, initialSelected }: PozycjeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formModal, setFormModal] = useState<FormModalState>({
    open: false,
    mode: 'add',
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Selected ID from URL
  const selectedId = searchParams.get('selected');
  const selectedPozycja = selectedId
    ? initialData.find((p) => p.id === selectedId)
    : null;

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('selected', id);
    router.push(`/pozycje?${params.toString()}`);
  };

  const handleAddClick = () => {
    setFormModal({ open: true, mode: 'add' });
  };

  const handleEdit = () => {
    if (selectedPozycja) {
      setFormModal({ open: true, mode: 'edit' });
    }
  };

  const handleDelete = () => {
    if (selectedPozycja) {
      setDeleteModalOpen(true);
    }
  };

  const handleDeleted = () => {
    // Close panel and deselect on successful delete
    const params = new URLSearchParams(searchParams.toString());
    params.delete('selected');
    router.push(`/pozycje?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <FiltersComponent onAddClick={handleAddClick} />

      <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Table - 40% width */}
        <div className="w-[40%] overflow-auto">
          <PozycjeTable
            data={initialData}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        {/* Panel - 60% width */}
        <div className="w-[60%]">
          {selectedPozycja ? (
            <PozycjaDetailPanel
              pozycja={selectedPozycja}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg bg-card">
              <p className="text-muted-foreground">Wybierz pozycję z listy</p>
            </div>
          )}
        </div>
      </div>

      <PozycjaFormModal
        mode={formModal.mode}
        pozycja={formModal.mode === 'edit' && selectedPozycja ? selectedPozycja : undefined}
        open={formModal.open}
        onOpenChange={(open) => setFormModal((prev) => ({ ...prev, open }))}
      />

      <DeletePozycjaModal
        pozycja={selectedPozycja ? {
          id: selectedPozycja.id,
          kod: selectedPozycja.kod,
          nazwa: selectedPozycja.nazwa,
        } : null}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

export function PozycjeView(props: PozycjeViewProps) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <PozycjeViewContent {...props} />
    </Suspense>
  );
}
