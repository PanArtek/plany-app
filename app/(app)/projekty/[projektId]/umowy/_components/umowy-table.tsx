'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { type UmowaRow } from '@/actions/umowy';
import { getUmowaStatusConfig } from '@/lib/umowy/status-config';
import { cn } from '@/lib/utils';

interface UmowyTableProps {
  data: UmowaRow[];
  onRowClick: (row: UmowaRow) => void;
}

function UmowaStatusBadge({ status }: { status: string }) {
  const c = getUmowaStatusConfig(status);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border', c.className)}>
      {c.label}
    </span>
  );
}

const fmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const columnHelper = createColumnHelper<UmowaRow>();

const columns = [
  columnHelper.accessor('numer', {
    header: 'Numer',
    cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('podwykonawca_nazwa', {
    header: 'Podwykonawca',
    cell: (info) => <span className="text-white/70">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <UmowaStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('pozycje_count', {
    header: 'Pozycje',
    cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('wartosc_total', {
    header: 'Wartość',
    cell: (info) => (
      <span className="text-white/70 text-sm">{fmt.format(info.getValue())} zł</span>
    ),
  }),
  columnHelper.accessor('avg_procent_wykonania', {
    header: 'Wykonanie',
    cell: (info) => {
      const pct = info.getValue();
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded bg-white/10">
            <div
              className="h-full rounded bg-emerald-500"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-white/50 text-xs">{pct}%</span>
        </div>
      );
    },
  }),
];

export function UmowyTable({ data, onRowClick }: UmowyTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak umów</p>
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
            className="hover:bg-white/5 border-b border-white/[0.06] cursor-pointer transition-colors"
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
