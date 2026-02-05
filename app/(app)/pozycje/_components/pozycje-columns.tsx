'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { type Pozycja } from '@/actions/pozycje';
import { obliczCenePozycji } from '@/lib/utils/pozycje';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TYP_COLORS: Record<string, string> = {
  robocizna: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  material: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  komplet: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
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
        className="flex items-center hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Kod
        <SortIcon column={column} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue('kod')}</span>
    ),
  },
  {
    accessorKey: 'nazwa',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Nazwa
        <SortIcon column={column} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="truncate max-w-[200px] block">{row.getValue('nazwa')}</span>
    ),
  },
  {
    accessorKey: 'jednostka',
    header: 'Jednostka',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('jednostka')}</span>
    ),
  },
  {
    accessorKey: 'typ',
    header: 'Typ',
    cell: ({ row }) => {
      const typ = row.getValue('typ') as string;
      return (
        <Badge className={TYP_COLORS[typ] || ''} variant="outline">
          {TYP_LABELS[typ] || typ}
        </Badge>
      );
    },
  },
  {
    id: 'cenaJednostkowa',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground justify-end w-full"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Cena jedn.
        <SortIcon column={column} />
      </button>
    ),
    accessorFn: (row) => obliczCenePozycji(row).cena,
    cell: ({ row }) => {
      const { cena } = obliczCenePozycji(row.original);
      return (
        <span className="font-mono text-sm text-right block">
          {formatCena(cena)}
        </span>
      );
    },
  },
];
