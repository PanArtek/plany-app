'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { type KosztorysPozycjaView } from '@/actions/kosztorys';
import { cn } from '@/lib/utils';

const BRANZA_NAMES: Record<string, string> = {
  BUD: 'Budowlana',
  ELE: 'Elektryczna',
  SAN: 'Sanitarna',
  TEL: 'Telekomunikacyjna',
  HVC: 'Klimatyzacja i wentylacja',
};

interface SidebarFilter {
  type: 'all' | 'branza' | 'kategoria';
  branzaKod?: string;
  kategoriaKod?: string;
}

interface KosztorysSidebarProps {
  pozycje: KosztorysPozycjaView[];
  activeFilter: SidebarFilter;
  onFilterChange: (filter: SidebarFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface BranzaGroup {
  kod: string;
  nazwa: string;
  count: number;
  kategorie: { kod: string; nazwa: string; count: number }[];
}

export function KosztorysSidebar({
  pozycje,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: KosztorysSidebarProps) {
  const [expandedBranzes, setExpandedBranzes] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const branzaMap = new Map<string, BranzaGroup>();

    for (const p of pozycje) {
      if (!p.kod) continue;
      const branzaKod = p.kod.substring(0, 3);
      const kategoriaKod = p.kod.substring(0, 6);

      if (!branzaMap.has(branzaKod)) {
        branzaMap.set(branzaKod, {
          kod: branzaKod,
          nazwa: BRANZA_NAMES[branzaKod] || branzaKod,
          count: 0,
          kategorie: [],
        });
      }

      const branza = branzaMap.get(branzaKod)!;
      branza.count++;

      let kategoria = branza.kategorie.find((k) => k.kod === kategoriaKod);
      if (!kategoria) {
        kategoria = {
          kod: kategoriaKod,
          nazwa: p.kategoria_nazwa || kategoriaKod,
          count: 0,
        };
        branza.kategorie.push(kategoria);
      }
      kategoria.count++;
    }

    return Array.from(branzaMap.values()).sort((a, b) => a.kod.localeCompare(b.kod));
  }, [pozycje]);

  const toggleExpand = (branzaKod: string) => {
    setExpandedBranzes((prev) => {
      const next = new Set(prev);
      if (next.has(branzaKod)) {
        next.delete(branzaKod);
      } else {
        next.add(branzaKod);
      }
      return next;
    });
  };

  const handleBranzaClick = (branzaKod: string) => {
    if (activeFilter.type === 'branza' && activeFilter.branzaKod === branzaKod) {
      onFilterChange({ type: 'all' });
    } else {
      onFilterChange({ type: 'branza', branzaKod });
    }
    toggleExpand(branzaKod);
  };

  const handleKategoriaClick = (branzaKod: string, kategoriaKod: string) => {
    if (activeFilter.type === 'kategoria' && activeFilter.kategoriaKod === kategoriaKod) {
      onFilterChange({ type: 'all' });
    } else {
      onFilterChange({ type: 'kategoria', branzaKod, kategoriaKod });
    }
  };

  return (
    <div className="w-[260px] shrink-0 border-r border-white/[0.08] p-4 flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <Input
          placeholder="Szukaj..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm bg-white/[0.03] border-white/[0.08]"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {/* All */}
        <button
          onClick={() => onFilterChange({ type: 'all' })}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
            activeFilter.type === 'all'
              ? "bg-amber-500/15 text-amber-500"
              : "text-white/60 hover:bg-white/[0.05] hover:text-white/80"
          )}
        >
          Wszystkie ({pozycje.length})
        </button>

        {tree.map((branza) => (
          <div key={branza.kod}>
            <button
              onClick={() => handleBranzaClick(branza.kod)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                activeFilter.type === 'branza' && activeFilter.branzaKod === branza.kod
                  ? "bg-amber-500/15 text-amber-500"
                  : "text-white/60 hover:bg-white/[0.05] hover:text-white/80"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform shrink-0",
                  expandedBranzes.has(branza.kod) && "rotate-90"
                )}
              />
              <span className="font-mono text-xs text-white/30 shrink-0">{branza.kod}</span>
              <span className="truncate">{branza.nazwa}</span>
              <span className="ml-auto text-xs text-white/30">{branza.count}</span>
            </button>

            {expandedBranzes.has(branza.kod) && (
              <div className="ml-4 space-y-0.5">
                {branza.kategorie.map((kat) => (
                  <button
                    key={kat.kod}
                    onClick={() => handleKategoriaClick(branza.kod, kat.kod)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors",
                      activeFilter.type === 'kategoria' && activeFilter.kategoriaKod === kat.kod
                        ? "bg-amber-500/15 text-amber-500"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                    )}
                  >
                    <span className="truncate">{kat.nazwa}</span>
                    <span className="ml-auto text-xs text-white/30">{kat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
