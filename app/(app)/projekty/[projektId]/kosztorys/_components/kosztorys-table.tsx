'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { type KosztorysPozycjaView } from '@/actions/kosztorys';
import { cn } from '@/lib/utils';

const BRANZA_NAMES: Record<string, string> = {
  BUD: 'Budowlana',
  ELE: 'Elektryczna',
  SAN: 'Sanitarna',
  TEL: 'Telekomunikacyjna',
  HVC: 'Klimatyzacja i wentylacja',
};

interface KosztorysTableProps {
  pozycje: KosztorysPozycjaView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLocked: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

interface BranzaGroup {
  kod: string;
  nazwa: string;
  sumaRazem: number;
  kategorie: KategoriaGroup[];
}

interface KategoriaGroup {
  kod: string;
  nazwa: string;
  sumaRazem: number;
  pozycje: KosztorysPozycjaView[];
}

export function KosztorysTable({ pozycje, selectedId, onSelect, isLocked, selectedIds, onSelectionChange }: KosztorysTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const branzaMap = new Map<string, BranzaGroup>();

    for (const p of pozycje) {
      const branzaKod = p.kod?.substring(0, 3) || '???';
      const katKod = p.kod?.substring(0, 6) || '???';

      if (!branzaMap.has(branzaKod)) {
        branzaMap.set(branzaKod, {
          kod: branzaKod,
          nazwa: BRANZA_NAMES[branzaKod] || branzaKod,
          sumaRazem: 0,
          kategorie: [],
        });
      }

      const branza = branzaMap.get(branzaKod)!;
      branza.sumaRazem += p.razem;

      let kategoria = branza.kategorie.find((k) => k.kod === katKod);
      if (!kategoria) {
        kategoria = {
          kod: katKod,
          nazwa: p.kategoria_nazwa || katKod,
          sumaRazem: 0,
          pozycje: [],
        };
        branza.kategorie.push(kategoria);
      }
      kategoria.sumaRazem += p.razem;
      kategoria.pozycje.push(p);
    }

    return Array.from(branzaMap.values()).sort((a, b) => a.kod.localeCompare(b.kod));
  }, [pozycje]);

  const toggleCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allVisibleIds = useMemo(
    () => pozycje.map((p) => p.id),
    [pozycje]
  );

  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allVisibleIds));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  if (pozycje.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/40">
        <FileText className="h-12 w-12" />
        <div className="text-center">
          <div className="text-lg font-medium">Brak pozycji w kosztorysie</div>
          <div className="text-sm mt-1">Dodaj pozycje z biblioteki, aby rozpocząć wycenę</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-[#1A1A24]/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-white/50 text-xs">
            {!isLocked && (
              <th className="px-2 py-2.5 w-[40px]" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                />
              </th>
            )}
            <th className="px-3 py-2.5 text-right w-[60px]">Lp</th>
            <th className="px-3 py-2.5 text-left w-[120px]">Kod</th>
            <th className="px-3 py-2.5 text-left">Zadanie</th>
            <th className="px-3 py-2.5 text-right w-[80px]">Ilość</th>
            <th className="px-3 py-2.5 text-left w-[60px]">Jedn.</th>
            <th className="px-3 py-2.5 text-right w-[90px]">R</th>
            <th className="px-3 py-2.5 text-right w-[90px]">M</th>
            <th className="px-3 py-2.5 text-right w-[80px]">Narzut %</th>
            <th className="px-3 py-2.5 text-right w-[100px]">Cena/j</th>
            <th className="px-3 py-2.5 text-right w-[110px]">Wartość</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((branza) => {
            const branzaCollapsed = collapsedGroups.has(branza.kod);
            return (
              <GroupRows
                key={branza.kod}
                branza={branza}
                branzaCollapsed={branzaCollapsed}
                collapsedGroups={collapsedGroups}
                onToggleBranza={() => toggleCollapse(branza.kod)}
                onToggleKategoria={(katKod) => toggleCollapse(katKod)}
                selectedId={selectedId}
                onSelect={onSelect}
                isLocked={isLocked}
                selectedIds={selectedIds}
                onToggleOne={toggleOne}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  branza,
  branzaCollapsed,
  collapsedGroups,
  onToggleBranza,
  onToggleKategoria,
  selectedId,
  onSelect,
  isLocked,
  selectedIds,
  onToggleOne,
}: {
  branza: BranzaGroup;
  branzaCollapsed: boolean;
  collapsedGroups: Set<string>;
  onToggleBranza: () => void;
  onToggleKategoria: (katKod: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLocked: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
}) {
  const colSpanHeader = isLocked ? 9 : 10;
  return (
    <>
      {/* Branża header */}
      <tr
        onClick={onToggleBranza}
        className="cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border-b border-white/[0.06]"
      >
        <td colSpan={colSpanHeader} className="px-3 py-2">
          <div className="flex items-center gap-2 font-medium text-white/70">
            <ChevronRight className={cn("h-4 w-4 transition-transform", !branzaCollapsed && "rotate-90")} />
            <span className="font-mono text-xs text-amber-500/70">{branza.kod}</span>
            <span>—</span>
            <span>{branza.nazwa}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right font-medium text-white/70">
          Σ {formatCurrency(branza.sumaRazem)} zł
        </td>
      </tr>

      {!branzaCollapsed && branza.kategorie.map((kat) => {
        const katCollapsed = collapsedGroups.has(kat.kod);
        return (
          <KategoriaRows
            key={kat.kod}
            kategoria={kat}
            katCollapsed={katCollapsed}
            onToggle={() => onToggleKategoria(kat.kod)}
            selectedId={selectedId}
            onSelect={onSelect}
            isLocked={isLocked}
            selectedIds={selectedIds}
            onToggleOne={onToggleOne}
          />
        );
      })}
    </>
  );
}

function KategoriaRows({
  kategoria,
  katCollapsed,
  onToggle,
  selectedId,
  onSelect,
  isLocked,
  selectedIds,
  onToggleOne,
}: {
  kategoria: KategoriaGroup;
  katCollapsed: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLocked: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
}) {
  const colSpanHeader = isLocked ? 9 : 10;
  return (
    <>
      {/* Kategoria header */}
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-white/[0.03] border-b border-white/[0.04]"
      >
        <td colSpan={colSpanHeader} className="px-3 py-1.5 pl-8">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", !katCollapsed && "rotate-90")} />
            <span className="font-mono text-white/30">{kategoria.kod}</span>
            <span>—</span>
            <span>{kategoria.nazwa}</span>
          </div>
        </td>
        <td className="px-3 py-1.5 text-right text-xs text-white/50">
          Σ {formatCurrency(kategoria.sumaRazem)} zł
        </td>
      </tr>

      {!katCollapsed && kategoria.pozycje.map((p) => (
        <tr
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={cn(
            "cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors",
            selectedId === p.id && "border-l-2 border-l-amber-500 bg-amber-500/[0.05]"
          )}
        >
          {!isLocked && (
            <td
              className="px-2 py-2"
              onClick={(e) => {
                e.stopPropagation();
                onToggleOne(p.id);
              }}
            >
              <Checkbox checked={selectedIds.has(p.id)} />
            </td>
          )}
          <td className="px-3 py-2 text-right text-white/40 font-mono text-xs">{p.lp}</td>
          <td className="px-3 py-2 font-mono text-xs text-white/40">{p.kod || '—'}</td>
          <td className="px-3 py-2 font-medium text-white/80">{p.nazwa}</td>
          <td className="px-3 py-2 text-right text-white/60">{formatQuantity(p.ilosc)}</td>
          <td className="px-3 py-2 text-white/40 text-xs">{p.jednostka || '—'}</td>
          <td className="px-3 py-2 text-right text-white/60">{formatCurrency(p.r_jednostkowy)}</td>
          <td className="px-3 py-2 text-right text-white/60">{formatCurrency(p.m_jednostkowy)}</td>
          <td className="px-3 py-2 text-right text-white/50">{Math.round(p.narzut_percent)}%</td>
          <td className="px-3 py-2 text-right text-white/60">
            {p.ilosc > 0 ? formatCurrency(p.razem / p.ilosc) : '—'}
          </td>
          <td className="px-3 py-2 text-right font-semibold text-white/90">{formatCurrency(p.razem)} zł</td>
        </tr>
      ))}
    </>
  );
}
