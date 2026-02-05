'use client';

import { cn } from '@/lib/utils';

interface SkladowaItem {
  id: string;
  opis?: string;
  nazwa?: string;
  stawka_domyslna?: number | null;
  cena_domyslna?: number | null;
  norma_domyslna?: number | null;
}

interface SkladoweSectionProps {
  title: string;
  items: SkladowaItem[];
  suma: number;
  colorClass: string;
}

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function SkladoweSection({ title, items, suma, colorClass }: SkladoweSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className={cn('font-medium text-sm', colorClass)}>{title}</h4>
        <span className={cn('font-mono text-sm', colorClass)}>{formatCena(suma)}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">Brak składowych</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const label = item.opis || item.nazwa || '—';
            const cena = (item.stawka_domyslna ?? item.cena_domyslna ?? 0) * (item.norma_domyslna ?? 0);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 px-2 bg-card rounded text-sm"
              >
                <span className="truncate max-w-[70%]">{label}</span>
                <span className="font-mono text-muted-foreground">{formatCena(cena)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
