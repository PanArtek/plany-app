'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { type ProjektWithCount } from '@/actions/projekty';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils';

interface ProjektyTableProps {
  data: ProjektWithCount[];
  onRowClick: (projekt: ProjektWithCount) => void;
}

const columnHelper = createColumnHelper<ProjektWithCount>();

const columns = [
  columnHelper.accessor('nazwa', {
    header: 'Nazwa',
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('klient', {
    header: 'Klient',
    cell: (info) => (
      <span className="text-white/70">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      return <StatusBadge status={status} />;
    },
  }),
  columnHelper.accessor('sent_at', {
    header: 'Wysłano',
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="text-white/50 text-sm">
          {val ? new Date(val).toLocaleDateString('pl-PL') : '—'}
        </span>
      );
    },
  }),
  columnHelper.accessor('rewizjeCount', {
    header: 'Rewizje',
    cell: (info) => (
      <span className="font-mono text-sm">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('created_at', {
    header: 'Data',
    cell: (info) => (
      <span className="text-white/50 text-sm">
        {new Date(info.getValue()).toLocaleDateString('pl-PL')}
      </span>
    ),
  }),
];

export { StatusBadge } from './status-badge';

export function ProjektyTable({ data, onRowClick }: ProjektyTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak projektów</p>
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
