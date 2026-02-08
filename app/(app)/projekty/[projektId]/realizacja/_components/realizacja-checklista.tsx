'use client';

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ZamowienieChecklistaRow, UmowaChecklistaRow } from '@/actions/realizacja';
import { getZamowienieStatusConfig } from '@/lib/zamowienia/status-config';
import { getUmowaStatusConfig } from '@/lib/umowy/status-config';

interface RealizacjaChecklistaProps {
  zamowienia: ZamowienieChecklistaRow[];
  umowy: UmowaChecklistaRow[];
  projektId: string;
}

const ZAMOWIENIE_DONE_STATUSES = ['wyslane', 'czesciowo', 'dostarczone', 'rozliczone'];
const UMOWA_DONE_STATUSES = ['podpisana', 'wykonana', 'rozliczona'];

export function RealizacjaChecklista({ zamowienia, umowy, projektId }: RealizacjaChecklistaProps) {
  const zamDoneCount = zamowienia.filter((z) => ZAMOWIENIE_DONE_STATUSES.includes(z.status)).length;
  const umDoneCount = umowy.filter((u) => UMOWA_DONE_STATUSES.includes(u.status)).length;

  return (
    <div className="space-y-8">
      {/* Zamówienia materiałów */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Zamówienia materiałów</h3>
          <span className="text-xs text-white/40">{zamDoneCount}/{zamowienia.length} ✓</span>
        </div>
        {zamowienia.length === 0 ? (
          <p className="text-sm text-white/30 py-4">Brak zamówień — zostaną wygenerowane po akceptacji rewizji</p>
        ) : (
          <div className="space-y-2">
            {zamowienia.map((z) => {
              const isDone = ZAMOWIENIE_DONE_STATUSES.includes(z.status);
              const statusConfig = getZamowienieStatusConfig(z.status);
              return (
                <Link
                  key={z.id}
                  href={`/projekty/${projektId}/zamowienia?detail=${z.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                    isDone
                      ? 'border-white/[0.04] bg-white/[0.01] opacity-60'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded border flex items-center justify-center shrink-0',
                    isDone ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/[0.1]'
                  )}>
                    {isDone && <Check className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <span className="text-sm font-mono text-white/70 w-28 shrink-0">{z.numer}</span>
                  <span className="text-sm text-white/50 flex-1 truncate">{z.dostawca_nazwa}</span>
                  <span className="text-sm text-white/50 w-24 text-right shrink-0">
                    {z.wartosc.toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', statusConfig.className)}>
                    {statusConfig.label}
                  </span>
                  {!isDone && <ArrowRight className="h-4 w-4 text-white/20 shrink-0" />}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Umowy z podwykonawcami */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Umowy z podwykonawcami</h3>
          <span className="text-xs text-white/40">{umDoneCount}/{umowy.length} ✓</span>
        </div>
        {umowy.length === 0 ? (
          <p className="text-sm text-white/30 py-4">Brak umów — zostaną wygenerowane po akceptacji rewizji</p>
        ) : (
          <div className="space-y-2">
            {umowy.map((u) => {
              const isDone = UMOWA_DONE_STATUSES.includes(u.status);
              const statusConfig = getUmowaStatusConfig(u.status);
              return (
                <Link
                  key={u.id}
                  href={`/projekty/${projektId}/umowy?detail=${u.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                    isDone
                      ? 'border-white/[0.04] bg-white/[0.01] opacity-60'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded border flex items-center justify-center shrink-0',
                    isDone ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/[0.1]'
                  )}>
                    {isDone && <Check className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <span className="text-sm font-mono text-white/70 w-28 shrink-0">{u.numer}</span>
                  <span className="text-sm text-white/50 flex-1 truncate">{u.podwykonawca_nazwa}</span>
                  <span className="text-sm text-white/50 w-24 text-right shrink-0">
                    {u.wartosc.toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', statusConfig.className)}>
                    {statusConfig.label}
                  </span>
                  {u.avg_procent_wykonania > 0 && (
                    <span className="text-xs text-white/30 shrink-0">{u.avg_procent_wykonania}%</span>
                  )}
                  {!isDone && <ArrowRight className="h-4 w-4 text-white/20 shrink-0" />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
