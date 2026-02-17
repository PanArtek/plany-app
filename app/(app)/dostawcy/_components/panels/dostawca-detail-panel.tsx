'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2, Plus, Star, ExternalLink, Mail } from 'lucide-react';
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
  getDostawca,
  getDostawcaCennik,
  getDostawcaPozycje,
  type DostawcaBase,
  type CennikEntry,
  type DostawcaPozycja,
} from '@/actions/dostawcy';
import { CopyContractData } from '@/components/copy-contract-data';

interface DostawcaDetailPanelProps {
  dostawcaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddCena: () => void;
  onEditCena: (cena: CennikEntry) => void;
  onDeleteCena: (cenaId: string) => void;
}

function formatPrice(value: number, jednostka: string): string {
  return value.toFixed(2).replace('.', ',') + ` zł/${jednostka}`;
}

export function DostawcaDetailPanel({
  dostawcaId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddCena,
  onEditCena,
  onDeleteCena,
}: DostawcaDetailPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dostawca, setDostawca] = useState<DostawcaBase | null>(null);
  const [cennik, setCennik] = useState<CennikEntry[]>([]);
  const [pozycje, setPozycje] = useState<DostawcaPozycja[]>([]);

  useEffect(() => {
    if (open && dostawcaId) {
      setLoading(true);
      Promise.all([
        getDostawca(dostawcaId),
        getDostawcaCennik(dostawcaId),
        getDostawcaPozycje(dostawcaId),
      ]).then(([d, c, p]) => {
        setDostawca(d);
        setCennik(c);
        setPozycje(p);
      }).catch(() => {
        setDostawca(null);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open, dostawcaId]);

  const handleDeleteCena = (cenaId: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę pozycję z cennika?')) {
      onDeleteCena(cenaId);
    }
  };

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="wide">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        {loading ? (
          <SlidePanelTitle>Ładowanie...</SlidePanelTitle>
        ) : dostawca ? (
          <>
            <div className="flex items-center gap-3">
              <SlidePanelTitle>{dostawca.nazwa}</SlidePanelTitle>
              {dostawca.kod && (
                <Badge variant="outline" className="font-mono text-amber-500 bg-amber-500/10 border-amber-500/20">
                  {dostawca.kod}
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
          <SlidePanelTitle>Nie znaleziono dostawcy</SlidePanelTitle>
        )}
      </SlidePanelHeader>

      <SlidePanelContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : dostawca ? (
          <>
            {/* Ocena */}
            {dostawca.ocena && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < dostawca.ocena! ? 'fill-amber-500 text-amber-500' : 'text-white/20'}`}
                  />
                ))}
                <span className="text-sm text-white/60 ml-2">{dostawca.ocena}/5</span>
              </div>
            )}

            {/* Section 1: Dane kontaktowe */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Dane kontaktowe
              </h4>
              <div className="space-y-2">
                {dostawca.kontakt && (
                  <p className="text-sm text-white/80">{dostawca.kontakt}</p>
                )}
                {dostawca.email && (
                  <a href={`mailto:${dostawca.email}`} className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {dostawca.email}
                  </a>
                )}
                {dostawca.strona_www && (
                  <a href={dostawca.strona_www.startsWith('http') ? dostawca.strona_www : `https://${dostawca.strona_www}`} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3" />
                    {dostawca.strona_www}
                  </a>
                )}
                {!dostawca.kontakt && !dostawca.email && !dostawca.strona_www && (
                  <p className="text-sm text-white/50">Brak danych kontaktowych</p>
                )}
              </div>
            </div>

            {/* Copy contract data */}
            <CopyContractData
              nazwaPelna={dostawca.nazwa_pelna}
              nip={dostawca.nip}
              regon={dostawca.regon}
              krs={dostawca.krs}
              adresSiedziby={dostawca.adres_siedziby}
              osobaReprezentujaca={dostawca.osoba_reprezentujaca}
              nrKonta={dostawca.nr_konta}
            />

            {/* Uwagi */}
            {dostawca.uwagi && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Uwagi
                </h4>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{dostawca.uwagi}</p>
              </div>
            )}

            {/* Section 2: Cennik produktów */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Cennik produktów ({cennik.length})
                </h4>
                <button
                  onClick={onAddCena}
                  className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Dodaj produkt
                </button>
              </div>
              {cennik.length === 0 ? (
                <p className="text-sm text-white/50">Brak produktów w cenniku</p>
              ) : (
                <div className="space-y-2">
                  {cennik.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-amber-500 text-sm mr-2">{c.produktSku}</span>
                        <span className="text-sm text-white/80">{c.produktNazwa}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-amber-500">
                          {formatPrice(c.cenaNetto, c.produktJednostka)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onEditCena(c); }}
                          className="h-7 w-7 text-white/30 hover:text-white/60"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCena(c.id); }}
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
