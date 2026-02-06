'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaterialyPaginationProps {
  totalCount: number;
  page: number;
  pageSize: number;
}

export function MaterialyPagination({ totalCount, page, pageSize }: MaterialyPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', String(newPage));
    }
    router.push(`/materialy?${params.toString()}`);
  };

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];

    if (page <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A24]/40 border border-white/[0.08] rounded-lg">
      <span className="text-sm text-white/50">
        Wyświetlanie {start}-{end} z {totalCount}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            page <= 1
              ? "opacity-50 pointer-events-none"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 text-white/30 text-sm">...</span>
          ) : (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={cn(
                "min-w-[32px] h-8 px-2 text-sm rounded-md transition-colors",
                p === page
                  ? "bg-amber-500/15 text-amber-500"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            page >= totalPages
              ? "opacity-50 pointer-events-none"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
