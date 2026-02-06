'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { type ZamowienieRow } from '@/actions/zamowienia';
import { getZamowienieStatusConfig } from '@/lib/zamowienia/status-config';
import { cn } from '@/lib/utils';

interface ZamowieniaTableProps {
  data: ZamowienieRow[];
  onRowClick: (row: ZamowienieRow) => void;
}

function ZamowienieStatusBadge({ status }: { status: string }) {
  const c = getZamowienieStatusConfig(status);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border', c.className)}>
      {c.label}
    </span>
  );
}

const fmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const columnHelper = createColumnHelper<ZamowienieRow>();

const columns = [
  columnHelper.accessor('numer', {
    header: 'Numer',
    cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('dostawca_nazwa', {
    header: 'Dostawca',
    cell: (info) => <span className="text-white/70">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <ZamowienieStatusBadge status={info.getValue()} />,
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
  columnHelper.accessor('dostarczone_ratio', {
    header: 'Dostarczone',
    cell: (info) => <span className="text-white/50 text-sm">{info.getValue()}</span>,
  }),
];

export function ZamowieniaTable({ data, onRowClick }: ZamowieniaTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak zamówień</p>
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
