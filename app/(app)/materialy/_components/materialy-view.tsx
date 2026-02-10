'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsBar } from '@/components/stats-bar';
import { type MaterialyResult, type ProduktWithAggregation, type MaterialyStats, deleteProdukt } from '@/actions/materialy';
import { MaterialyFilters } from './materialy-filters';
import { MaterialyTable } from './materialy-table';
import { MaterialyPagination } from './materialy-pagination';
import { MaterialDetailPanel } from './panels/material-detail-panel';
import { MaterialFormPanel } from './panels/material-form-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

interface MaterialyViewProps {
  initialData: MaterialyResult;
  stats: MaterialyStats;
  initialBranza?: string;
  branzaLabel?: string;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function MaterialyViewContent({ initialData, stats, branzaLabel }: MaterialyViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailPanel, setDetailPanel] = useState<{ open: boolean; produktId: string | null }>({
    open: false,
    produktId: null,
  });
  const [formPanel, setFormPanel] = useState<FormPanelState>({
    open: false,
    mode: 'add',
  });
  const [deletePanel, setDeletePanel] = useState<{ open: boolean; produkt: ProduktWithAggregation | null }>({
    open: false,
    produkt: null,
  });

  // Find selected produkt for edit mode
  const selectedProdukt = detailPanel.produktId
    ? initialData.data.find((p) => p.id === detailPanel.produktId)
    : null;

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleRowClick = (produkt: ProduktWithAggregation) => {
    setDetailPanel({ open: true, produktId: produkt.id });
  };

  const handleEdit = () => {
    if (selectedProdukt) {
      setFormPanel({ open: true, mode: 'edit' });
    }
  };

  const handleDelete = () => {
    if (selectedProdukt) {
      setDeletePanel({ open: true, produkt: selectedProdukt });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePanel.produkt) return;

    const result = await deleteProdukt(deletePanel.produkt.id);
    if (result.success) {
      toast.success(`Usunięto "${deletePanel.produkt.nazwa}"`);
      setDeletePanel({ open: false, produkt: null });
      setDetailPanel({ open: false, produktId: null });
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
    router.push(`/materialy?${params.toString()}`);
  };

  const statsItems = [
    { label: 'Produkty', value: String(stats.total) },
    { label: 'Z dostawcami', value: String(stats.withSuppliers) },
    { label: 'Bez dostawców', value: String(stats.withoutSuppliers) },
    { label: 'Śr. cena', value: stats.avgPrice != null ? `${stats.avgPrice.toFixed(2).replace('.', ',')} zł` : '—' },
  ];

  // Build breadcrumb
  const breadcrumbSegments: { label: string; isLast: boolean }[] = [
    { label: `Materiały (${initialData.totalCount})`, isLast: !branzaLabel },
  ];
  if (branzaLabel) {
    breadcrumbSegments[0].isLast = false;
    breadcrumbSegments.push({ label: branzaLabel, isLast: true });
  }

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
        <Button onClick={handleAddClick} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj materiał
        </Button>
      </div>

      <StatsBar items={statsItems} />

      <MaterialyFilters />

      {initialData.data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 430px)' }}>
          <p className="text-muted-foreground text-sm">Brak materiałów</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 430px)' }}>
            <MaterialyTable
              data={initialData.data}
              onRowClick={handleRowClick}
              sort={searchParams.get('sort') || undefined}
              order={(searchParams.get('order') as 'asc' | 'desc') || undefined}
              onSortChange={handleSortChange}
            />
          </div>
          <MaterialyPagination
            totalCount={initialData.totalCount}
            page={initialData.page}
            pageSize={initialData.pageSize}
          />
        </>
      )}

      {/* Detail panel */}
      <MaterialDetailPanel
        produktId={detailPanel.produktId}
        open={detailPanel.open}
        onOpenChange={(open) => setDetailPanel((prev) => ({ ...prev, open }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form panel (add/edit) */}
      <MaterialFormPanel
        mode={formPanel.mode}
        produkt={formPanel.mode === 'edit' && selectedProdukt ? selectedProdukt : undefined}
        open={formPanel.open}
        onOpenChange={(open) => setFormPanel((prev) => ({ ...prev, open }))}
      />

      {/* Delete confirm panel */}
      {deletePanel.produkt && (
        <DeleteConfirmPanel
          itemName={deletePanel.produkt.nazwa}
          itemKod={deletePanel.produkt.sku}
          title="Usuń materiał"
          warningMessage="Ta operacja jest nieodwracalna. Jeśli materiał jest używany w pozycjach lub cennikach, usunięcie zostanie zablokowane."
          open={deletePanel.open}
          onOpenChange={(open) => setDeletePanel((prev) => ({ ...prev, open }))}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export function MaterialyView(props: MaterialyViewProps) {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <MaterialyViewContent {...props} />
    </Suspense>
  );
}
