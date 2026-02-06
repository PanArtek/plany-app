'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { type ProjektWithCount } from '@/actions/projekty';
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

// Inline status badge (will be extracted to shared config in PROJ-004)
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Szkic', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    ofertowanie: { label: 'Ofertowanie', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    realizacja: { label: 'Realizacja', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    zamkniety: { label: 'Zamknięty', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    odrzucony: { label: 'Odrzucony', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };

  const c = config[status] || { label: status, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border', c.className)}>
      {c.label}
    </span>
  );
}

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
