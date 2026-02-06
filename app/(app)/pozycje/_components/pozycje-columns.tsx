'use client';

import { ColumnDef, RowData } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { type Pozycja } from '@/actions/pozycje';
import { obliczCenePozycji } from '@/lib/utils/pozycje';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extend TanStack Table's ColumnMeta to add responsive visibility
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    hideOnMobile?: boolean;
    hideOnTablet?: boolean;
  }
}

const TYP_COLORS: Record<string, string> = {
  robocizna: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  material: 'bg-green-500/10 text-green-400 border-green-500/20',
  komplet: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const TYP_LABELS: Record<string, string> = {
  robocizna: 'R',
  material: 'M',
  komplet: 'R+M',
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

interface PozycjeColumnsOptions {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function getPozycjeColumns({ onEdit, onDelete }: PozycjeColumnsOptions): ColumnDef<Pozycja>[] {
  return [
  {
    accessorKey: 'kod',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground text-sm font-medium text-muted-foreground"
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
        className="flex items-center hover:text-foreground text-sm font-medium text-muted-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Nazwa
        <SortIcon column={column} />
      </button>
    ),
    cell: ({ row }) => (
      <span className="block truncate max-w-[150px] md:max-w-none text-sm font-normal text-foreground">
        {row.getValue('nazwa')}
      </span>
    ),
    minSize: 200,
  },
  {
    accessorKey: 'jednostka',
    header: () => <span className="text-sm font-medium text-muted-foreground text-center block">Jedn.</span>,
    cell: ({ row }) => (
      <span className="text-sm text-white/50 text-center block font-mono">
        {row.getValue('jednostka')}
      </span>
    ),
    size: 70,
    meta: { hideOnMobile: true },
  },
  {
    accessorKey: 'typ',
    header: () => <span className="text-sm font-medium text-muted-foreground">Typ</span>,
    cell: ({ row }) => {
      const typ = row.getValue('typ') as string;
      return (
        <Badge className={TYP_COLORS[typ] || ''} variant="outline">
          {TYP_LABELS[typ] || typ}
        </Badge>
      );
    },
    size: 70,
    meta: { hideOnTablet: true },
  },
  {
    id: 'cenaJednostkowa',
    header: ({ column }) => (
      <button
        className="flex items-center hover:text-foreground justify-end w-full text-sm font-medium text-muted-foreground"
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
        <span className="font-mono text-sm font-medium text-right block tabular-nums">
          {formatCena(cena)}
        </span>
      );
    },
    size: 110,
  },
  {
    id: 'akcje',
    header: () => null,
    cell: ({ row }) => (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original.id);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    size: 80,
  },
];
}
