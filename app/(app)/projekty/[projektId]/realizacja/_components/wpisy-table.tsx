'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { RealizacjaWpisRow } from '@/actions/realizacja';
import { getWpisTypConfig } from '@/lib/realizacja/typ-config';
import { cn } from '@/lib/utils';

const fmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface WpisyTableProps {
  wpisy: RealizacjaWpisRow[];
  onRowClick: (id: string) => void;
  onToggleOplacone: (id: string, value: boolean) => void;
}

const columnHelper = createColumnHelper<RealizacjaWpisRow>();

const columns = [
  columnHelper.accessor('oplacone', {
    header: '',
    size: 48,
    enableSorting: true,
    cell: (info) => (
      <input
        type="checkbox"
        checked={info.getValue()}
        onClick={(e) => e.stopPropagation()}
        onChange={() => {/* handled by onToggleOplacone via onClick */}}
        className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
      />
    ),
  }),
  columnHelper.accessor('typ', {
    header: 'Typ',
    size: 112,
    enableSorting: true,
    cell: (info) => {
      const config = getWpisTypConfig(info.getValue());
      return (
        <span className={cn('text-xs px-2 py-0.5 rounded-full border', config.className)}>
          {config.label}
        </span>
      );
    },
  }),
  columnHelper.accessor('opis', {
    header: 'Opis',
    enableSorting: false,
    cell: (info) => (
      <span className="truncate max-w-xs block">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('numer_faktury', {
    header: 'Nr faktury',
    size: 128,
    enableSorting: false,
    cell: (info) => (
      <span className="font-mono text-sm">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('data_faktury', {
    header: 'Data',
    size: 112,
    enableSorting: true,
    cell: (info) => {
      const val = info.getValue();
      if (!val) return <span className="text-white/30">—</span>;
      return <span className="text-sm">{new Date(val).toLocaleDateString('pl-PL')}</span>;
    },
  }),
  columnHelper.display({
    id: 'powiazanie',
    header: 'Powiązanie',
    size: 128,
    cell: ({ row }) => {
      const numer = row.original.zamowienie_numer || row.original.umowa_numer;
      if (!numer) return <span className="text-white/30">—</span>;
      return <span className="text-amber-500/70 text-sm">{numer}</span>;
    },
  }),
  columnHelper.accessor('kwota_netto', {
    header: () => <div className="text-right">Kwota netto</div>,
    size: 128,
    enableSorting: true,
    cell: (info) => (
      <div className="text-right">{fmt.format(info.getValue())} zł</div>
    ),
  }),
];

export function WpisyTable({ wpisy, onRowClick, onToggleOplacone }: WpisyTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'data_faktury', desc: true },
  ]);

  const table = useReactTable({
    data: wpisy,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sum = useMemo(() => wpisy.reduce((acc, w) => acc + w.kwota_netto, 0), [wpisy]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-[#0A0A0F] z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'text-left px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium border-b border-white/[0.06]',
                    header.column.getCanSort() && 'cursor-pointer select-none hover:text-white/70'
                  )}
                  style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <ArrowUpDown className="h-3 w-3 text-white/30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-white/30 text-sm">
                Brak wyników dla wybranych filtrów
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row.original.id)}
                className={cn(
                  'hover:bg-white/[0.03] border-b border-white/[0.06] cursor-pointer transition-colors',
                  row.original.oplacone && 'opacity-60'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm"
                    onClick={cell.column.id === 'oplacone' ? (e) => {
                      e.stopPropagation();
                      onToggleOplacone(row.original.id, !row.original.oplacone);
                    } : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {wpisy.length > 0 && (
          <tfoot>
            <tr className="border-t border-white/[0.08]">
              <td colSpan={columns.length - 1} className="px-4 py-3 text-sm font-medium text-white/70">
                RAZEM
              </td>
              <td className="px-4 py-3 text-sm font-medium text-right text-white/90">
                {fmt.format(sum)} zł
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
