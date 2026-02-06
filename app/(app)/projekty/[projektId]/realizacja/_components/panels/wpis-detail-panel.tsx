'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import type { RealizacjaWpisRow } from '@/actions/realizacja';
import { deleteRealizacjaWpis } from '@/actions/realizacja';
import { getWpisTypConfig } from '@/lib/realizacja/typ-config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface WpisDetailPanelProps {
  open: boolean;
  onClose: () => void;
  wpisId: string | null;
  wpisy: RealizacjaWpisRow[];
  onEdit: (id: string) => void;
  projektId: string;
}

export function WpisDetailPanel({ open, onClose, wpisId, wpisy, onEdit, projektId }: WpisDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const wpis = wpisId ? wpisy.find((w) => w.id === wpisId) : null;

  const handleDelete = async () => {
    if (!wpisId) return;
    setDeleting(true);
    const result = await deleteRealizacjaWpis(wpisId, projektId);
    setDeleting(false);
    if (result.success) {
      toast.success('Wpis usunięty');
      setShowDeleteConfirm(false);
      onClose();
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  if (!wpis) {
    return (
      <SlidePanel open={open} onOpenChange={handleOpenChange}>
        <SlidePanelHeader onClose={onClose}>
          <SlidePanelTitle>Wpis</SlidePanelTitle>
        </SlidePanelHeader>
        <SlidePanelContent>
          <p className="text-white/40">Nie znaleziono wpisu</p>
        </SlidePanelContent>
      </SlidePanel>
    );
  }

  const typConfig = getWpisTypConfig(wpis.typ);

  return (
    <SlidePanel open={open} onOpenChange={handleOpenChange}>
      <SlidePanelHeader onClose={onClose}>
        <SlidePanelTitle>
          <div className="flex items-center gap-3">
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', typConfig.className)}>
              {typConfig.label}
            </span>
            <span>{wpis.numer_faktury || 'Bez numeru'}</span>
          </div>
        </SlidePanelTitle>
      </SlidePanelHeader>
      <SlidePanelContent className="space-y-4">
        {/* Info rows */}
        <div className="space-y-1.5">
          {([
            ['Typ', (
              <span key="typ" className={cn('text-xs px-2 py-0.5 rounded-full border', typConfig.className)}>
                {typConfig.label}
              </span>
            )],
            ['Kwota netto', `${fmt.format(wpis.kwota_netto)} zł`],
            ['Numer faktury', wpis.numer_faktury || '—'],
            ['Data faktury', wpis.data_faktury ? new Date(wpis.data_faktury).toLocaleDateString('pl-PL') : '—'],
            ['Opis', wpis.opis || '—'],
            ['Powiązanie', wpis.zamowienie_numer || wpis.umowa_numer || 'Brak'],
            ['Opłacone', wpis.oplacone ? (
              <span key="opl" className="flex items-center gap-1 text-emerald-400">
                <Check className="h-4 w-4" /> Tak
              </span>
            ) : (
              <span key="opl" className="flex items-center gap-1 text-red-400">
                <X className="h-4 w-4" /> Nie
              </span>
            )],
          ] as [string, React.ReactNode][]).map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
              <span className="text-white/50 text-sm">{label}</span>
              <span className="text-white/90 text-sm">{value}</span>
            </div>
          ))}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-md p-3 space-y-2">
            <p className="text-sm text-red-300">Na pewno usunąć ten wpis?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                Tak
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Nie
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { if (wpisId) onEdit(wpisId); }}
            className="text-white/60 hover:text-white/80"
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edytuj
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Usuń
          </Button>
        </div>
      </SlidePanelContent>
    </SlidePanel>
  );
}
