'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface SkladowaItem {
  id: string;
  // Robocizna fields
  typ_robocizny_id?: string;
  podwykonawca_id?: string;
  cena?: number;
  typy_robocizny?: { id: string; nazwa: string; jednostka: string | null } | null;
  podwykonawcy?: { id: string; nazwa: string } | null;
  // Material fields
  produkt_id?: string;
  dostawca_id?: string;
  norma_domyslna?: number | null;
  jednostka?: string | null;
  produkty?: { id: string; nazwa: string; sku: string; jednostka: string } | null;
  dostawcy?: { id: string; nazwa: string; kod: string | null } | null;
}

interface SkladoweSectionProps {
  title: string;
  items: SkladowaItem[];
  suma: number;
  variant?: 'primary' | 'secondary';
  editable?: boolean;
  onAdd?: () => void;
  onEdit?: (item: SkladowaItem) => void;
  onDelete?: (item: SkladowaItem) => void;
  cennikPrices?: Record<string, number | null>;
}

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

function getItemLabel(item: SkladowaItem): string {
  // Robocizna: show typ name
  if (item.typy_robocizny?.nazwa) return item.typy_robocizny.nazwa;
  // Material: show produkt name
  if (item.produkty?.nazwa) return item.produkty.nazwa;
  return '—';
}

function getItemSubLabel(item: SkladowaItem): string {
  // Robocizna: show podwykonawca
  if (item.podwykonawcy?.nazwa) return item.podwykonawcy.nazwa;
  // Material: show dostawca + norma
  if (item.dostawcy?.nazwa) {
    const norma = item.norma_domyslna ?? 0;
    const j = item.jednostka || 'j.';
    return `${item.dostawcy.nazwa} · ${norma} ${j}`;
  }
  return '';
}

function getItemCost(item: SkladowaItem, cennikPrice?: number | null): number {
  // If cennik price is available, use it
  if (cennikPrice !== undefined && cennikPrice !== null) {
    // For materials: cennik price * norma; for robocizna: just the stawka
    if (item.norma_domyslna !== undefined && item.norma_domyslna !== null && item.produkty) {
      return cennikPrice * item.norma_domyslna;
    }
    return cennikPrice;
  }
  // Robocizna: cena is stored directly
  if (item.cena !== undefined) return item.cena;
  return 0;
}

export function SkladoweSection({
  title,
  items,
  suma,
  variant = 'primary',
  editable = true,
  onAdd,
  onEdit,
  onDelete,
  cennikPrices,
}: SkladoweSectionProps) {
  const titleColorClass = variant === 'primary' ? 'text-amber-400' : 'text-amber-400/70';

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
            const label = getItemLabel(item);
            const subLabel = getItemSubLabel(item);
            const cennikPrice = cennikPrices?.[item.id];
            const cost = getItemCost(item, cennikPrice);
            const hasMissingPrice = cennikPrices !== undefined && (cennikPrice === null || cennikPrice === undefined);

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between py-1.5 px-2 bg-card rounded text-sm hover:bg-amber-500/5 transition-colors"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate">{label}</span>
                  {subLabel && (
                    <span className="text-xs text-muted-foreground">{subLabel}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasMissingPrice ? (
                    <span className="text-xs text-orange-400">brak w cenniku</span>
                  ) : cost > 0 ? (
                    <span className="font-mono text-muted-foreground">{formatCena(cost)}</span>
                  ) : null}
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
