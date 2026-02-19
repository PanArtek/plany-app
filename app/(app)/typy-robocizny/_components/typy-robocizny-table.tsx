'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUp, Trash2 } from 'lucide-react';
import { type TypRobocizny } from '@/actions/typy-robocizny';
import { cn } from '@/lib/utils';

interface TypyRobociznyTableProps {
  data: TypRobocizny[];
  onRowClick: (typ: TypRobocizny) => void;
  onDelete: (typ: TypRobocizny) => void;
  sort?: string;
  order?: 'asc' | 'desc';
  onSortChange: (sort: string) => void;
}

const columnHelper = createColumnHelper<TypRobocizny>();

const SORT_KEYS: Record<string, string> = {
  nazwa: 'nazwa',
  jednostka: 'jednostka',
};

export function TypyRobociznyTable({ data, onRowClick, onDelete, sort, order, onSortChange }: TypyRobociznyTableProps) {
  const columns = [
    columnHelper.accessor('nazwa', {
      header: 'Nazwa',
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('jednostka', {
      header: 'Jednostka',
      cell: (info) => (
        <span className="font-mono text-xs text-amber-500">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('opis', {
      header: 'Opis',
      cell: (info) => (
        <span className="text-white/50 truncate max-w-[300px] inline-block">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('aktywny', {
      header: 'Status',
      cell: (info) => {
        const aktywny = info.getValue();
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              aktywny
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {aktywny ? 'Aktywny' : 'Nieaktywny'}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(info.row.original);
          }}
          className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Brak typów robocizny</p>
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
