'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { type ProduktWithAggregation } from '@/actions/materialy';
import { cn } from '@/lib/utils';

interface MaterialyTableProps {
  data: ProduktWithAggregation[];
  onRowClick: (produkt: ProduktWithAggregation) => void;
}

const columnHelper = createColumnHelper<ProduktWithAggregation>();

function formatPrice(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(2).replace('.', ',') + ' zł';
}

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
    header: 'Najlepsza cena',
    cell: (info) => (
      <span className="font-mono text-amber-500">{formatPrice(info.getValue())}</span>
    ),
  }),
];

export function MaterialyTable({ data, onRowClick }: MaterialyTableProps) {
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
