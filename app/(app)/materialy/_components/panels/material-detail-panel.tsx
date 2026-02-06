'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
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
  getProdukt,
  getProduktDostawcy,
  getProduktPozycje,
  type ProduktBase,
  type ProduktDostawca,
  type ProduktPozycja,
} from '@/actions/materialy';

interface MaterialDetailPanelProps {
  produktId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatPrice(value: number, jednostka: string): string {
  return value.toFixed(2).replace('.', ',') + ` zł/${jednostka}`;
}

export function MaterialDetailPanel({ produktId, open, onOpenChange, onEdit, onDelete }: MaterialDetailPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [produkt, setProdukt] = useState<ProduktBase | null>(null);
  const [dostawcy, setDostawcy] = useState<ProduktDostawca[]>([]);
  const [pozycje, setPozycje] = useState<ProduktPozycja[]>([]);

  useEffect(() => {
    if (open && produktId) {
      setLoading(true);
      Promise.all([
        getProdukt(produktId),
        getProduktDostawcy(produktId),
        getProduktPozycje(produktId),
      ]).then(([p, d, poz]) => {
        setProdukt(p);
        setDostawcy(d);
        setPozycje(poz);
      }).catch(() => {
        setProdukt(null);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open, produktId]);

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        {loading ? (
          <SlidePanelTitle>Ładowanie...</SlidePanelTitle>
        ) : produkt ? (
          <>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-amber-500 bg-amber-500/10 border-amber-500/20">
                {produkt.sku}
              </Badge>
              <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10">
                {produkt.jednostka}
              </Badge>
            </div>
            <SlidePanelTitle className="mt-2">{produkt.nazwa}</SlidePanelTitle>
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
          <SlidePanelTitle>Nie znaleziono produktu</SlidePanelTitle>
        )}
      </SlidePanelHeader>

      <SlidePanelContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : produkt ? (
          <>
            {/* Section 1: Dostawcy z cenami */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Dostawcy z cenami
              </h4>
              {dostawcy.length === 0 ? (
                <p className="text-sm text-white/50">Brak dostawców w cenniku</p>
              ) : (
                <div className="space-y-2">
                  {dostawcy.map((d, i) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]"
                    >
                      <span className="text-sm text-white/80">{d.dostawcaNazwa}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-amber-500">
                          {formatPrice(d.cenaNetto, produkt.jednostka)}
                        </span>
                        {i === 0 && (
                          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 text-[10px]">
                            NAJLEPSZA
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Używany w pozycjach */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Używany w pozycjach ({pozycje.length})
              </h4>
              {pozycje.length === 0 ? (
                <p className="text-sm text-white/50">Nie jest używany w żadnej pozycji</p>
              ) : (
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
              )}
            </div>
          </>
        ) : null}
      </SlidePanelContent>
    </SlidePanel>
  );
}
