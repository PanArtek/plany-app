'use client';

import { ColumnDef, RowData } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { type Pozycja } from '@/actions/pozycje';
import { obliczCenePozycji } from '@/lib/utils/pozycje';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Extend TanStack Table's ColumnMeta to add responsive visibility
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    hideOnMobile?: boolean;
    hideOnTablet?: boolean;
  }
}

const TYP_COLORS: Record<string, string> = {
  robocizna: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  material: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  komplet: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const TYP_LABELS: Record<string, string> = {
  robocizna: 'Robocizna',
  material: 'Materiał',
  komplet: 'Komplet',
};

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

function SortIcon({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sorted = column.getIsSorted();
  if (!sorted) return null;
  return sorted === 'asc' ? (
    <ChevronUp className="ml-1 h-4 w-4" />
  ) : (
    <ChevronDown className="ml-1 h-4 w-4" />
  );
}

export const pozycjeColumns: ColumnDef<Pozycja>[] = [
  {
    accessorKey: 'kod',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground text-xs uppercase tracking-wider font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Kod
        <SortIcon column={column} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm text-amber-500 font-medium">{row.getValue('kod')}</span>
    ),
    size: 140,
  },
  {
    accessorKey: 'nazwa',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground text-xs uppercase tracking-wider font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Nazwa
        <SortIcon column={column} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="block truncate max-w-[150px] md:max-w-none font-medium text-foreground">
        {row.getValue('nazwa')}
      </span>
    ),
    minSize: 200,
  },
  {
    accessorKey: 'jednostka',
    header: () => <span className="text-xs uppercase tracking-wider font-medium text-center block">Jedn.</span>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground text-center block font-mono">
        {row.getValue('jednostka')}
      </span>
    ),
    size: 70,
    meta: { hideOnMobile: true },
  },
  {
    accessorKey: 'typ',
    header: () => <span className="text-xs uppercase tracking-wider font-medium">Typ</span>,
    cell: ({ row }) => {
      const typ = row.getValue('typ') as string;
      return (
        <Badge className={TYP_COLORS[typ] || ''} variant="outline">
          {TYP_LABELS[typ] || typ}
        </Badge>
      );
    },
    size: 100,
    meta: { hideOnTablet: true },
  },
  {
    id: 'cenaJednostkowa',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground justify-end w-full text-xs uppercase tracking-wider font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Cena
        <SortIcon column={column} />
      </button>
    ),
    accessorFn: (row) => obliczCenePozycji(row).cena,
    cell: ({ row }) => {
      const { cena } = obliczCenePozycji(row.original);
      return (
        <span className="font-mono text-sm text-right block tabular-nums">
          {formatCena(cena)}
        </span>
      );
    },
    size: 110,
  },
];
