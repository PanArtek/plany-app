'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  totalCount: number;
  page: number;
  pageSize: number;
  kategoriaNazwa?: string;
  podkategoriaNazwa?: string;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function PozycjeViewContent({ initialData, initialFilters, initialSelected, totalCount, page, pageSize, kategoriaNazwa, podkategoriaNazwa }: PozycjeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
  });

  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Selected ID from URL
  const selectedId = searchParams.get('selected');
  const selectedPozycja = selectedId
    ? initialData.find((p) => p.id === selectedId)
    : null;

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('selected', id);
    router.push(`/pozycje?${params.toString()}`);
    setDetailPanelOpen(true);
  };

  const handleDetailPanelClose = (open: boolean) => {
    setDetailPanelOpen(open);
    if (!open) {
      // Clear selection when panel closes
      const params = new URLSearchParams(searchParams.toString());
      params.delete('selected');
      router.push(`/pozycje?${params.toString()}`);
    }
  };

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleEdit = () => {
    if (selectedPozycja) {
      setFormPanel({ open: true, mode: 'edit' });
    }
  };

  const handleEditById = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('selected', id);
    router.push(`/pozycje?${params.toString()}`);
    setFormPanel({ open: true, mode: 'edit' });
  };

  const handleDelete = () => {
    if (selectedPozycja) {
      setDeletePanelOpen(true);
    }
  };

  const handleDeleteById = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('selected', id);
    router.push(`/pozycje?${params.toString()}`);
    setDeletePanelOpen(true);
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

  // Build breadcrumb segments
  const breadcrumbSegments: { label: string; isLast: boolean }[] = [{ label: 'Pozycje', isLast: false }];
  if (initialFilters.branza) {
    breadcrumbSegments.push({ label: initialFilters.branza, isLast: false });
    if (kategoriaNazwa) {
      breadcrumbSegments.push({ label: kategoriaNazwa, isLast: false });
      if (podkategoriaNazwa) {
        breadcrumbSegments.push({ label: podkategoriaNazwa, isLast: false });
      }
    }
  }
  // Mark last segment
  breadcrumbSegments[breadcrumbSegments.length - 1].isLast = true;

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
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj pozycję
        </Button>
      </div>

      <FiltersComponent />

      {/* Full-width table or empty state */}
      {initialData.length === 0 && !initialFilters.branza ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 220px)' }}>
          <p className="text-muted-foreground text-sm">Wybierz branżę aby wyświetlić pozycje</p>
        </div>
      ) : (
        <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)' }}>
          <PozycjeTable
            data={initialData}
            selectedId={selectedId}
            onSelect={handleSelect}
            onEdit={handleEditById}
            onDelete={handleDeleteById}
          />
        </div>
      )}

      {/* Detail panel as SlidePanel */}
      {selectedPozycja && (
        <PozycjaDetailPanel
          pozycja={selectedPozycja}
          open={detailPanelOpen}
          onOpenChange={handleDetailPanelClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

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
