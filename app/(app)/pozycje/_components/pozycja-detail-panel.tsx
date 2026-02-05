'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { type Pozycja } from '@/actions/pozycje';
import { obliczCenePozycji } from '@/lib/utils/pozycje';
import { SkladoweSection } from './skladowe-section';

interface PozycjaDetailPanelProps {
  pozycja: Pozycja;
  onEdit: () => void;
  onDelete: () => void;
}

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function PozycjaDetailPanel({ pozycja, onEdit, onDelete }: PozycjaDetailPanelProps) {
  const { robocizna, material, cena } = obliczCenePozycji(pozycja);

  // Extract branza.kategoria.podkategoria from kod
  const kodParts = pozycja.kod.split('.');
  const breadcrumb = kodParts.slice(0, -1).join('.');

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        {breadcrumb && (
          <p className="text-xs text-muted-foreground font-mono mb-1">{breadcrumb}</p>
        )}
        <h3 className="text-lg font-medium">{pozycja.nazwa}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span className="font-mono">{pozycja.kod}</span>
          <span>•</span>
          <span>{pozycja.jednostka}</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <SkladoweSection
          title="Robocizna"
          items={pozycja.biblioteka_skladowe_robocizna || []}
          suma={robocizna}
          colorClass="text-blue-600 dark:text-blue-400"
        />

        <SkladoweSection
          title="Materiały"
          items={pozycja.biblioteka_skladowe_materialy || []}
          suma={material}
          colorClass="text-green-600 dark:text-green-400"
        />

        {pozycja.opis && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Opis</h4>
            <p className="text-sm whitespace-pre-wrap">{pozycja.opis}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Cena jednostkowa NETTO</span>
          <span className="text-xl font-mono font-semibold">{formatCena(cena)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onEdit} className="flex-1">
            <Pencil className="h-4 w-4 mr-2" />
            Edytuj
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
