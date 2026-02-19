'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { type Pozycja, type CennikPrices } from '@/actions/pozycje';
import { getPozycjeColumns } from './pozycje-columns';
import { cn } from '@/lib/utils';

interface PozycjeTableProps {
  data: Pozycja[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  cennikPrices?: CennikPrices;
}

export function PozycjeTable({ data, selectedId, onSelect, onEdit, onDelete, cennikPrices }: PozycjeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = getPozycjeColumns({ onEdit, onDelete, cennikPrices });

  const table = useReactTable({
    data,
    columns,
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
              {headerGroup.headers.map((header) => {
                const hideOnMobile = header.column.columnDef.meta?.hideOnMobile;
                const hideOnTablet = header.column.columnDef.meta?.hideOnTablet;
                return (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                    hideOnMobile && "hidden md:table-cell",
                    hideOnTablet && "hidden lg:table-cell"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
              onClick={() => onSelect(row.original.id)}
              className={cn(
                'group cursor-pointer border-b border-white/[0.03] transition-colors',
                'hover:bg-white/5',
                selectedId === row.original.id && 'bg-amber-500/10 border-l-2 border-l-amber-500 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]'
              )}
            >
              {row.getVisibleCells().map((cell) => {
                const hideOnMobile = cell.column.columnDef.meta?.hideOnMobile;
                const hideOnTablet = cell.column.columnDef.meta?.hideOnTablet;
                return (
                <td
                  key={cell.id}
                  className={cn(
                    "px-4 py-3",
                    hideOnMobile && "hidden md:table-cell",
                    hideOnTablet && "hidden lg:table-cell"
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
