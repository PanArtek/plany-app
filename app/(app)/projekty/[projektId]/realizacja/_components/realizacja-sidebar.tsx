'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RealizacjaStats } from '@/actions/realizacja';
import { ZAMOWIENIE_STATUS_CONFIG } from '@/lib/zamowienia/status-config';
import { UMOWA_STATUS_CONFIG } from '@/lib/umowy/status-config';

const fmt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function BudgetRow({ label, planowane, rzeczywiste, color }: { label: string; planowane: number; rzeczywiste: number; color: string }) {
  const pct = planowane > 0 ? Math.round((rzeczywiste / planowane) * 100) : 0;
  const barColor = pct < 80 ? 'bg-emerald-500' : pct <= 100 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">{label}</span>
        <span className={`text-xs font-medium ${pct > 100 ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-xs text-white/40">
        {fmt(rzeczywiste)} / {fmt(planowane)} zł
      </div>
    </div>
  );
}

interface RealizacjaSidebarProps {
  stats: RealizacjaStats;
  projektId: string;
}

export function RealizacjaSidebar({ stats, projektId }: RealizacjaSidebarProps) {
  const { budzet, zamowienia, umowy } = stats;
  const rzeczywisteRazem = budzet.rzeczywiste_razem;
  const planowaneRazem = budzet.planowane_razem;
  const pctRazem = planowaneRazem > 0 ? Math.round((rzeczywisteRazem / planowaneRazem) * 100) : 0;
  const barColorRazem = pctRazem < 80 ? 'bg-emerald-500' : pctRazem <= 100 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-4">
      {/* BUDŻET */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-white/40">Budżet</h3>

        <BudgetRow label="Materiały" planowane={budzet.planowane_m} rzeczywiste={budzet.rzeczywiste_m} color="blue" />
        <BudgetRow label="Robocizna" planowane={budzet.planowane_r} rzeczywiste={budzet.rzeczywiste_r} color="amber" />

        {budzet.rzeczywiste_inne > 0 && (
          <div className="text-sm text-white/50">
            Inne: {fmt(budzet.rzeczywiste_inne)} zł
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-3 mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/90">RAZEM</span>
            <span className={`text-xs font-medium ${pctRazem > 100 ? 'text-red-400' : pctRazem >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pctRazem}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all ${barColorRazem}`}
              style={{ width: `${Math.min(pctRazem, 100)}%` }}
            />
          </div>
          <div className="text-xs text-white/40">
            {fmt(rzeczywisteRazem)} / {fmt(planowaneRazem)} zł
          </div>
        </div>
      </div>

      {/* ZAMÓWIENIA */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase tracking-wider text-white/40">Zamówienia</h3>
            <span className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded text-white/50">{zamowienia.total}</span>
          </div>
          <Link href={`/projekty/${projektId}/zamowienia`} className="text-white/30 hover:text-white/60 transition-colors">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-1">
          {Object.entries(zamowienia.per_status).map(([status, count]) => {
            if (count === 0) return null;
            const config = ZAMOWIENIE_STATUS_CONFIG[status as keyof typeof ZAMOWIENIE_STATUS_CONFIG];
            if (!config) return null;
            return (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${config.className.includes('text-blue') ? 'bg-blue-400' : config.className.includes('text-amber') ? 'bg-amber-400' : config.className.includes('text-emerald') ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                  <span className="text-white/50">{config.label}</span>
                </div>
                <span className="text-white/70">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-white/40 pt-1 border-t border-white/[0.06]">
          Wartość: {fmt(zamowienia.wartosc_total)} zł
        </div>
      </div>

      {/* UMOWY */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase tracking-wider text-white/40">Umowy</h3>
            <span className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded text-white/50">{umowy.total}</span>
          </div>
          <Link href={`/projekty/${projektId}/umowy`} className="text-white/30 hover:text-white/60 transition-colors">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-1">
          {Object.entries(umowy.per_status).map(([status, count]) => {
            if (count === 0) return null;
            const config = UMOWA_STATUS_CONFIG[status as keyof typeof UMOWA_STATUS_CONFIG];
            if (!config) return null;
            return (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${config.className.includes('text-blue') ? 'bg-blue-400' : config.className.includes('text-amber') ? 'bg-amber-400' : config.className.includes('text-emerald') ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                  <span className="text-white/50">{config.label}</span>
                </div>
                <span className="text-white/70">{count}</span>
              </div>
            );
          })}
        </div>
        {umowy.total > 0 && (
          <div className="text-xs text-white/40">
            Wykonanie: {umowy.avg_procent_wykonania}%
          </div>
        )}
        <div className="text-xs text-white/40 pt-1 border-t border-white/[0.06]">
          Wartość: {fmt(umowy.wartosc_total)} zł
        </div>
      </div>
    </div>
  );
}
