'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import {
  getPodwykonawca,
  getPodwykonawcaStawki,
  getPodwykonawcaPozycje,
  type PodwykonawcaBase,
  type StawkaEntry,
  type PodwykonawcaPozycja,
} from '@/actions/podwykonawcy';

interface PodwykonawcaDetailPanelProps {
  podwykonawcaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddStawka: () => void;
  onEditStawka: (stawka: StawkaEntry) => void;
  onDeleteStawka: (stawkaId: string) => void;
}

function formatPrice(value: number, jednostka: string): string {
  return value.toFixed(2).replace('.', ',') + ` zł/${jednostka}`;
}

export function PodwykonawcaDetailPanel({
  podwykonawcaId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddStawka,
  onEditStawka,
  onDeleteStawka,
}: PodwykonawcaDetailPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [podwykonawca, setPodwykonawca] = useState<PodwykonawcaBase | null>(null);
  const [stawki, setStawki] = useState<StawkaEntry[]>([]);
  const [pozycje, setPozycje] = useState<PodwykonawcaPozycja[]>([]);

  useEffect(() => {
    if (open && podwykonawcaId) {
      setLoading(true);
      Promise.all([
        getPodwykonawca(podwykonawcaId),
        getPodwykonawcaStawki(podwykonawcaId),
        getPodwykonawcaPozycje(podwykonawcaId),
      ]).then(([p, s, poz]) => {
        setPodwykonawca(p);
        setStawki(s);
        setPozycje(poz);
      }).catch(() => {
        setPodwykonawca(null);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open, podwykonawcaId]);

  const handleDeleteStawka = (stawkaId: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę pozycję z cennika?')) {
      onDeleteStawka(stawkaId);
    }
  };

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="wide">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        {loading ? (
          <SlidePanelTitle>Ładowanie...</SlidePanelTitle>
        ) : podwykonawca ? (
          <>
            <div className="flex items-center gap-3">
              <SlidePanelTitle>{podwykonawca.nazwa}</SlidePanelTitle>
              {podwykonawca.specjalizacja && (
                <Badge variant="outline" className="font-mono text-amber-500 bg-amber-500/10 border-amber-500/20">
                  {podwykonawca.specjalizacja}
                </Badge>
              )}
            </div>
            <SlidePanelDescription>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 text-white/50 hover:text-white">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </SlidePanelDescription>
          </>
        ) : (
          <SlidePanelTitle>Nie znaleziono podwykonawcy</SlidePanelTitle>
        )}
      </SlidePanelHeader>

      <SlidePanelContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : podwykonawca ? (
          <>
            {/* Section 1: Dane kontaktowe */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Dane kontaktowe
              </h4>
              {podwykonawca.kontakt ? (
                <p className="text-sm text-white/80 whitespace-pre-wrap">{podwykonawca.kontakt}</p>
              ) : (
                <p className="text-sm text-white/50">Brak danych kontaktowych</p>
              )}
            </div>

            {/* Section 2: Cennik stawek */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Cennik stawek ({stawki.length})
                </h4>
                <button
                  onClick={onAddStawka}
                  className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Dodaj pozycję
                </button>
              </div>
              {stawki.length === 0 ? (
                <p className="text-sm text-white/50">Brak stawek w cenniku</p>
              ) : (
                <div className="space-y-2">
                  {stawki.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-amber-500 text-sm mr-2">{s.pozycjaKod}</span>
                        <span className="text-sm text-white/80">{s.pozycjaNazwa}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-amber-500">
                          {formatPrice(s.stawka, s.pozycjaJednostka)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onEditStawka(s); }}
                          className="h-7 w-7 text-white/30 hover:text-white/60"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDeleteStawka(s.id); }}
                          className="h-7 w-7 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Używany w pozycjach (only if count > 0) */}
            {pozycje.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Używany w pozycjach ({pozycje.length})
                </h4>
                <div className="space-y-1">
                  {pozycje.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/pozycje?selected=${p.id}`)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
                    >
                      <span className="font-mono text-amber-500 text-sm mr-2">{p.kod}</span>
                      <span className="text-sm text-white/80">{p.nazwa}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </SlidePanelContent>
    </SlidePanel>
  );
}
