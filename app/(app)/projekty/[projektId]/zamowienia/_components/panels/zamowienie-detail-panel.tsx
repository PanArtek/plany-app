'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import {
  type ZamowienieDetail,
  getZamowienie,
  changeZamowienieStatus,
  deleteZamowienie,
} from '@/actions/zamowienia';
import { getZamowienieStatusConfig } from '@/lib/zamowienia/status-config';
import { DostawaForm } from './dostawa-form';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ZamowienieDetailPanelProps {
  zamowienieId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  const c = getZamowienieStatusConfig(status);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border', c.className)}>
      {c.label}
    </span>
  );
}

export function ZamowienieDetailPanel({ zamowienieId, open, onOpenChange }: ZamowienieDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<ZamowienieDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDostawaForm, setShowDostawaForm] = useState(false);

  useEffect(() => {
    if (open && zamowienieId) {
      setLoading(true);
      setShowDostawaForm(false);
      getZamowienie(zamowienieId).then((d) => {
        setDetail(d);
        setLoading(false);
      });
    } else {
      setDetail(null);
    }
  }, [open, zamowienieId]);

  const refreshDetail = async () => {
    if (!zamowienieId) return;
    const d = await getZamowienie(zamowienieId);
    setDetail(d);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!zamowienieId) return;
    const result = await changeZamowienieStatus(zamowienieId, newStatus);
    if (result.success) {
      toast.success('Status zmieniony');
      await refreshDetail();
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd zmiany statusu');
    }
  };

  const handleDelete = async () => {
    if (!zamowienieId || !confirm('Czy na pewno usunąć to zamówienie?')) return;
    const result = await deleteZamowienie(zamowienieId);
    if (result.success) {
      toast.success('Zamówienie usunięte');
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const handleDostawaSubmit = async () => {
    setShowDostawaForm(false);
    await refreshDetail();
    router.refresh();
    toast.success('Dostawa dodana');
  };

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="wide">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>
          {loading ? 'Ładowanie...' : detail ? (
            <div className="flex items-center gap-3">
              {detail.numer}
              <StatusBadge status={detail.status} />
            </div>
          ) : 'Zamówienie'}
        </SlidePanelTitle>
      </SlidePanelHeader>
      <SlidePanelContent className="space-y-6">
        {detail && (
          <>
            {/* Dane zamówienia */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Dane zamówienia</h4>
              <div className="space-y-1.5">
                {[
                  ['Dostawca', detail.dostawca_nazwa],
                  ['Data zamówienia', detail.data_zamowienia ? new Date(detail.data_zamowienia).toLocaleDateString('pl-PL') : '—'],
                  ['Planowana data dostawy', detail.data_dostawy_planowana ? new Date(detail.data_dostawy_planowana).toLocaleDateString('pl-PL') : '—'],
                  ['Uwagi', detail.uwagi || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-white/50 text-sm">{label}</span>
                    <span className="text-white/90 text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Pozycje */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">
                Pozycje ({detail.pozycje.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs uppercase">
                      <th className="text-left py-2 px-2">Produkt</th>
                      <th className="text-right py-2 px-2">Ilość</th>
                      <th className="text-right py-2 px-2">Cena j.</th>
                      <th className="text-right py-2 px-2">Wartość</th>
                      <th className="text-right py-2 px-2">Dostarczone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.pozycje.map((p) => (
                      <tr key={p.id} className="border-t border-white/[0.06]">
                        <td className="py-2 px-2 text-white/80">{p.nazwa}</td>
                        <td className="py-2 px-2 text-right text-white/60">{p.ilosc_zamowiona} {p.jednostka}</td>
                        <td className="py-2 px-2 text-right text-white/60">{fmt.format(p.cena_jednostkowa)}</td>
                        <td className="py-2 px-2 text-right text-white/80">{fmt.format(p.wartosc)} zł</td>
                        <td className="py-2 px-2 text-right text-white/50">{p.ilosc_dostarczona}/{p.ilosc_zamowiona}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Dostawy */}
            {detail.dostawy.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">
                  Dostawy ({detail.dostawy.length})
                </h4>
                <div className="space-y-2">
                  {detail.dostawy.map((d) => (
                    <div key={d.id} className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/80 font-medium">
                          {new Date(d.data_dostawy).toLocaleDateString('pl-PL')}
                        </span>
                        {d.numer_wz && (
                          <span className="text-white/50">WZ: {d.numer_wz}</span>
                        )}
                      </div>
                      {d.uwagi && (
                        <p className="text-white/40 text-xs mt-1">{d.uwagi}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Dostawa form */}
            {showDostawaForm && (
              <DostawaForm
                pozycje={detail.pozycje}
                zamowienieId={detail.id}
                onSubmit={handleDostawaSubmit}
                onCancel={() => setShowDostawaForm(false)}
              />
            )}

            {/* Akcje */}
            {!showDostawaForm && (
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Akcje</h4>
                <div className="flex gap-2">
                  {detail.status === 'draft' && (
                    <>
                      <Button
                        onClick={() => handleStatusChange('wyslane')}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-1.5" />
                        Wyślij
                      </Button>
                      <Button
                        onClick={handleDelete}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Usuń
                      </Button>
                    </>
                  )}
                  {(detail.status === 'wyslane' || detail.status === 'czesciowo') && (
                    <Button
                      onClick={() => setShowDostawaForm(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                      size="sm"
                    >
                      <Truck className="h-4 w-4 mr-1.5" />
                      Dodaj dostawę
                    </Button>
                  )}
                  {detail.status === 'czesciowo' && (
                    <Button
                      onClick={() => handleStatusChange('dostarczone')}
                      variant="ghost"
                      size="sm"
                      className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Oznacz jako dostarczone
                    </Button>
                  )}
                  {detail.status === 'dostarczone' && (
                    <Button
                      onClick={() => handleStatusChange('rozliczone')}
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white/80"
                    >
                      Rozlicz
                    </Button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </SlidePanelContent>
    </SlidePanel>
  );
}
