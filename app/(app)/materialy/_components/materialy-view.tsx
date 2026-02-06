'use client';

import { useState, Suspense } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type MaterialyResult, type ProduktWithAggregation } from '@/actions/materialy';
import { MaterialyFilters } from './materialy-filters';
import { MaterialyTable } from './materialy-table';
import { MaterialyPagination } from './materialy-pagination';

interface MaterialyViewProps {
  initialData: MaterialyResult;
  initialBranza?: string;
  branzaLabel?: string;
}

interface FormPanelState {
  open: boolean;
  mode: 'add' | 'edit';
}

function MaterialyViewContent({ initialData, initialBranza, branzaLabel }: MaterialyViewProps) {
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

  const handleAddClick = () => {
    setFormPanel({ open: true, mode: 'add' });
  };

  const handleRowClick = (produkt: ProduktWithAggregation) => {
    setDetailPanel({ open: true, produktId: produkt.id });
  };

  // Build breadcrumb
  const breadcrumbSegments: { label: string; isLast: boolean }[] = [
    { label: 'Materiały', isLast: !branzaLabel },
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

      <MaterialyFilters />

      {initialData.data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 330px)' }}>
          <p className="text-muted-foreground text-sm">Brak materiałów</p>
        </div>
      ) : (
        <>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 330px)' }}>
            <MaterialyTable data={initialData.data} onRowClick={handleRowClick} />
          </div>
          <MaterialyPagination
            totalCount={initialData.totalCount}
            page={initialData.page}
            pageSize={initialData.pageSize}
          />
        </>
      )}

      {/* Panels will be wired in US-008 and US-009 */}
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
