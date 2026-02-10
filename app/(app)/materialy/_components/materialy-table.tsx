'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUp } from 'lucide-react';
import { type ProduktWithAggregation } from '@/actions/materialy';
import { cn } from '@/lib/utils';

interface MaterialyTableProps {
  data: ProduktWithAggregation[];
  onRowClick: (produkt: ProduktWithAggregation) => void;
  sort?: string;
  order?: 'asc' | 'desc';
  onSortChange: (sort: string) => void;
}

const columnHelper = createColumnHelper<ProduktWithAggregation>();

const SORT_KEYS: Record<string, string> = {
  nazwa: 'nazwa',
  pozycjeCount: 'pozycje',
  dostawcyCount: 'dostawcy',
  najlepszaCena: 'cena',
};

const columns = [
  columnHelper.accessor('nazwa', {
    header: 'Nazwa',
    cell: (info) => (
      <div>
        <div className="font-medium text-foreground">{info.getValue()}</div>
        <div className="font-mono text-amber-500 text-xs">{info.row.original.sku}</div>
      </div>
    ),
  }),
  columnHelper.accessor('jednostka', {
    header: 'Jednostka',
    cell: (info) => <span className="text-white/50">{info.getValue()}</span>,
  }),
  columnHelper.accessor('pozycjeCount', {
    header: 'Pozycje',
    cell: (info) => (
      <span className="font-mono">
        {info.getValue() > 0 ? `${info.getValue()} pozycji` : '0'}
      </span>
    ),
  }),
  columnHelper.accessor('dostawcyCount', {
    header: 'Dostawcy',
    cell: (info) => (
      <span className="font-mono">
        {info.getValue() > 0 ? `${info.getValue()} dostawców` : '0'}
      </span>
    ),
  }),
  columnHelper.accessor('najlepszaCena', {
    id: 'cena',
    header: 'Cena',
    cell: (info) => {
      const min = info.getValue();
      const max = info.row.original.najgorszaCena;
      if (min === null) return <span className="text-white/30">—</span>;
      const fmtMin = min.toFixed(2).replace('.', ',');
      if (max === null || max === min) {
        return <span className="font-mono text-amber-500">{fmtMin} zł</span>;
      }
      const fmtMax = max.toFixed(2).replace('.', ',');
      return <span className="font-mono text-amber-500">{fmtMin} – {fmtMax} zł</span>;
    },
  }),
];

export function MaterialyTable({ data, onRowClick, sort, order, onSortChange }: MaterialyTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak materiałów</p>
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
