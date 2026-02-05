'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { type Pozycja, deletePozycja } from '@/actions/pozycje';
import { type PozycjeFilters } from '@/lib/validations/pozycje';
import { PozycjeFilters as FiltersComponent } from './pozycje-filters';
import { PozycjeTable } from './pozycje-table';
import { PozycjaDetailPanel } from './pozycja-detail-panel';
import { PozycjaFormPanel } from './panels/pozycja-form-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

interface PozycjeViewProps {
  initialData: Pozycja[];
  initialFilters: PozycjeFilters;
  initialSelected: string | null;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function PozycjeViewContent({ initialData, initialFilters, initialSelected }: PozycjeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
  });

  const [deletePanelOpen, setDeletePanelOpen] = useState(false);

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
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleEdit = () => {
    if (selectedPozycja) {
      setFormPanel({ open: true, mode: 'edit' });
    }
  };

  const handleDelete = () => {
    if (selectedPozycja) {
      setDeletePanelOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPozycja) return;

    const result = await deletePozycja(selectedPozycja.id);
    if (result.success) {
      toast.success(`Usunięto "${selectedPozycja.nazwa}"`);
      setDeletePanelOpen(false);
      // Close panel and deselect on successful delete
      const params = new URLSearchParams(searchParams.toString());
      params.delete('selected');
      router.push(`/pozycje?${params.toString()}`);
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
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
            <div className="h-full flex items-center justify-center bg-[#0A0A0F] border-l border-white/[0.08] shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">
              <p className="text-white/40">Wybierz pozycję z listy</p>
            </div>
          )}
        </div>
      </div>

      <PozycjaFormPanel
        mode={formPanel.mode}
        pozycja={formPanel.mode === 'edit' && selectedPozycja ? selectedPozycja : undefined}
        open={formPanel.open}
        onOpenChange={(open) => setFormPanel((prev) => ({ ...prev, open }))}
      />

      {selectedPozycja && (
        <DeleteConfirmPanel
          itemName={selectedPozycja.nazwa}
          itemKod={selectedPozycja.kod}
          title="Usuń pozycję"
          warningMessage="Ta operacja jest nieodwracalna. Jeśli pozycja jest używana w kosztorysach, usunięcie zostanie zablokowane."
          open={deletePanelOpen}
          onOpenChange={setDeletePanelOpen}
          onConfirm={handleConfirmDelete}
        />
      )}
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
