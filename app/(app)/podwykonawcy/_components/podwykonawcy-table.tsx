'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUp } from 'lucide-react';
import { type PodwykonawcaWithCount } from '@/actions/podwykonawcy';
import { cn } from '@/lib/utils';

interface PodwykonawcyTableProps {
  data: PodwykonawcaWithCount[];
  onRowClick: (podwykonawca: PodwykonawcaWithCount) => void;
  sort?: string;
  order?: 'asc' | 'desc';
  onSortChange: (sort: string) => void;
}

const columnHelper = createColumnHelper<PodwykonawcaWithCount>();

const SORT_KEYS: Record<string, string> = {
  nazwa: 'nazwa',
  specjalizacja: 'specjalizacja',
  stawki: 'stawki',
};

const SPEC_COLORS: Record<string, string> = {
  'GK': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Tynki': 'bg-green-500/15 text-green-400 border-green-500/20',
  'Elektryka': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Hydraulika': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'Sufity': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Zabudowy': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Malowanie': 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  'Podłogi': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};
const DEFAULT_SPEC_COLOR = 'bg-white/5 text-white/60 border-white/10';

function getSpecColor(spec: string): string {
  for (const [key, color] of Object.entries(SPEC_COLORS)) {
    if (spec.includes(key)) return color;
  }
  return DEFAULT_SPEC_COLOR;
}

const columns = [
  columnHelper.accessor('nazwa', {
    header: 'Nazwa',
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('specjalizacja', {
    header: 'Specjalizacja',
    cell: (info) => {
      const spec = info.getValue();
      if (!spec) return <span className="text-white/30">—</span>;
      const colorClass = getSpecColor(spec);
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${colorClass}`}>
          {spec}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'stawki',
    header: 'Zakres stawek',
    cell: ({ row }) => {
      const { stawkiCount, minStawka, maxStawka } = row.original;
      if (stawkiCount === 0 || minStawka === null) return <span className="text-white/30">—</span>;
      const fmtMin = minStawka.toFixed(2).replace('.', ',');
      if (maxStawka === null || maxStawka === minStawka) {
        return (
          <div>
            <span className="font-mono text-amber-500">{fmtMin} zł</span>
            <span className="text-white/30 text-xs ml-2">({stawkiCount})</span>
          </div>
        );
      }
      const fmtMax = maxStawka.toFixed(2).replace('.', ',');
      return (
        <div>
          <span className="font-mono text-amber-500">{fmtMin} – {fmtMax} zł</span>
          <span className="text-white/30 text-xs ml-2">({stawkiCount})</span>
        </div>
      );
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

export function PodwykonawcyTable({ data, onRowClick, sort, order, onSortChange }: PodwykonawcyTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak podwykonawców</p>
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
