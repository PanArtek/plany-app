'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface SkladowaItem {
  id: string;
  opis?: string;
  nazwa?: string;
  stawka_domyslna?: number | null;
  cena_domyslna?: number | null;
  cena?: number | null;
  norma_domyslna?: number | null;
  jednostka?: string | null;
}

interface SkladoweSectionProps {
  title: string;
  items: SkladowaItem[];
  suma: number;
  variant?: 'primary' | 'secondary';
  /** 'material' uses norma*cena, 'robocizna' uses flat cena */
  type?: 'material' | 'robocizna';
  editable?: boolean;
  onAdd?: () => void;
  onEdit?: (item: SkladowaItem) => void;
  onDelete?: (item: SkladowaItem) => void;
}

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNormaInfo(item: SkladowaItem): string {
  const norma = item.norma_domyslna ?? 0;
  const rate = item.stawka_domyslna ?? item.cena_domyslna ?? 0;
  const jednostka = item.jednostka || 'j.';

  if (rate === 0) {
    return `${norma} ${jednostka}`;
  }
  return `${norma} ${jednostka} × ${rate.toFixed(2)} zł/${jednostka}`;
}

export function SkladoweSection({
  title,
  items,
  suma,
  variant = 'primary',
  type = 'material',
  editable = true,
  onAdd,
  onEdit,
  onDelete,
}: SkladoweSectionProps) {
  const titleColorClass = variant === 'primary' ? 'text-amber-400' : 'text-amber-400/70';
  const isRobocizna = type === 'robocizna';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className={cn('font-medium text-sm', titleColorClass)}>{title}</h4>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-amber-400">{formatCena(suma)}</span>
          {editable && onAdd && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onAdd}
            >
              <Plus className="h-3 w-3 mr-1" />
              Dodaj
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">Brak składowych</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const label = item.opis || item.nazwa || '—';
            const cena = isRobocizna
              ? Number(item.cena ?? 0)
              : (item.stawka_domyslna ?? item.cena_domyslna ?? 0) * (item.norma_domyslna ?? 0);

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between py-1.5 px-2 bg-card rounded text-sm hover:bg-amber-500/5 transition-colors"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate">{label}</span>
                  {!isRobocizna && (
                    <span className="text-xs text-muted-foreground">{formatNormaInfo(item)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{formatCena(cena)}</span>
                  {editable && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
