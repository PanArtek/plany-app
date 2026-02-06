'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { type DostawcaWithCount } from '@/actions/dostawcy';
import { cn } from '@/lib/utils';

interface DostawcyTableProps {
  data: DostawcaWithCount[];
  onRowClick: (dostawca: DostawcaWithCount) => void;
}

const columnHelper = createColumnHelper<DostawcaWithCount>();

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
  columnHelper.accessor('kontakt', {
    header: 'Kontakt',
    cell: (info) => (
      <span className="text-white/50 truncate max-w-[200px] inline-block">
        {info.getValue() || '—'}
      </span>
    ),
  }),
];

export function DostawcyTable({ data, onRowClick }: DostawcyTableProps) {
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
            {hg.headers.map((header) => (
              <th
                key={header.id}
                className="text-left px-4 py-3 text-white/50 text-xs uppercase tracking-wider font-medium border-b border-white/[0.06]"
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowClick(row.original)}
            className={cn(
              "hover:bg-white/5 border-b border-white/[0.06] cursor-pointer transition-colors"
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
