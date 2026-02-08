'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUp } from 'lucide-react';
import { type DostawcaWithCount } from '@/actions/dostawcy';
import { cn } from '@/lib/utils';

interface DostawcyTableProps {
  data: DostawcaWithCount[];
  onRowClick: (dostawca: DostawcaWithCount) => void;
  sort?: string;
  order?: 'asc' | 'desc';
  onSortChange: (sort: string) => void;
}

const columnHelper = createColumnHelper<DostawcaWithCount>();

const SORT_KEYS: Record<string, string> = {
  nazwa: 'nazwa',
  kod: 'kod',
  produktyCount: 'produkty',
  totalWartosc: 'wartosc',
};

function formatWartosc(value: number): string {
  if (value === 0) return '—';
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł';
}

const columns = [
  columnHelper.accessor('nazwa', {
    header: 'Nazwa',
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('kod', {
    header: 'Kod',
    cell: (info) => (
      <span className="font-mono text-xs text-amber-500">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('produktyCount', {
    header: 'Produkty',
    cell: (info) => (
      <span className="font-mono">
        {info.getValue() > 0 ? `${info.getValue()} produktów` : '0'}
      </span>
    ),
  }),
  columnHelper.accessor('totalWartosc', {
    header: 'Wartość cennika',
    cell: (info) => {
      const val = info.getValue();
      if (val === 0) return <span className="text-white/30">—</span>;
      return <span className="font-mono text-amber-500">{formatWartosc(val)}</span>;
    },
  }),
  columnHelper.accessor('kontakt', {
    header: 'Kontakt',
    cell: (info) => (
      <span className="text-white/50 truncate max-w-[200px] inline-block">
        {info.getValue() || '—'}
      </span>
    ),
  }),
];

export function DostawcyTable({ data, onRowClick, sort, order, onSortChange }: DostawcyTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak dostawców</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0 bg-[#0A0A0F] z-10">
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((header) => {
              const columnId = header.column.id;
              const sortKey = SORT_KEYS[columnId];
              const isSortable = !!sortKey;
              const isActive = sort === sortKey;

              return (
                <th
                  key={header.id}
                  onClick={isSortable ? () => onSortChange(sortKey) : undefined}
                  className={cn(
                    "text-left px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium border-b border-white/[0.06]",
                    isSortable && "cursor-pointer select-none hover:text-white/70"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {isActive && (
                      <ArrowUp className={cn("h-3 w-3", order === 'desc' && "rotate-180")} />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowClick(row.original)}
            className={cn(
              "hover:bg-white/5 border-b border-white/[0.06] cursor-pointer transition-colors",
              !row.original.aktywny && "opacity-50"
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="px-4 py-3 text-sm">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
