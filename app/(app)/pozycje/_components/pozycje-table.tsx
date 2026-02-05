'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { type Pozycja } from '@/actions/pozycje';
import { pozycjeColumns } from './pozycje-columns';
import { cn } from '@/lib/utils';

interface PozycjeTableProps {
  data: Pozycja[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PozycjeTable({ data, selectedId, onSelect }: PozycjeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns: pozycjeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Brak pozycji spełniających kryteria
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A24]/60 backdrop-blur-sm border border-white/[0.08] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-white/[0.03] border-b border-white/5 sticky top-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row.original.id)}
              className={cn(
                'cursor-pointer border-b border-white/[0.03] transition-colors',
                'hover:bg-white/5',
                selectedId === row.original.id && 'bg-amber-500/10 border-l-2 border-l-amber-500 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
