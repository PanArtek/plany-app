'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Trash2, Pen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import {
  type UmowaDetail,
  type UmowaPozycja,
  getUmowa,
  changeUmowaStatus,
  deleteUmowa,
} from '@/actions/umowy';
import { getUmowaStatusConfig } from '@/lib/umowy/status-config';
import { WykonanieForm } from './wykonanie-form';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface UmowaDetailPanelProps {
  umowaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  const c = getUmowaStatusConfig(status);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border', c.className)}>
      {c.label}
    </span>
  );
}

export function UmowaDetailPanel({ umowaId, open, onOpenChange }: UmowaDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<UmowaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPozycjaId, setSelectedPozycjaId] = useState<string | null>(null);

  useEffect(() => {
    if (open && umowaId) {
      setLoading(true);
      setSelectedPozycjaId(null);
      getUmowa(umowaId).then((d) => {
        setDetail(d);
        setLoading(false);
      });
    } else {
      setDetail(null);
    }
  }, [open, umowaId]);

  const refreshDetail = async () => {
    if (!umowaId) return;
    const d = await getUmowa(umowaId);
    setDetail(d);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!umowaId) return;
    const result = await changeUmowaStatus(umowaId, newStatus);
    if (result.success) {
      toast.success('Status zmieniony');
      await refreshDetail();
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd zmiany statusu');
    }
  };

  const handleDelete = async () => {
    if (!umowaId || !confirm('Czy na pewno usunąć tę umowę?')) return;
    const result = await deleteUmowa(umowaId);
    if (result.success) {
      toast.success('Umowa usunięta');
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const handleWykonanieSubmit = async () => {
    setSelectedPozycjaId(null);
    await refreshDetail();
    router.refresh();
    toast.success('Wpis wykonania dodany');
  };

  const handlePozycjaClick = (p: UmowaPozycja) => {
    if (detail?.status !== 'podpisana') return;
    setSelectedPozycjaId(prev => prev === p.id ? null : p.id);
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
          ) : 'Umowa'}
        </SlidePanelTitle>
      </SlidePanelHeader>
      <SlidePanelContent className="space-y-6">
        {detail && (
          <>
            {/* Dane umowy */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Dane umowy</h4>
              <div className="space-y-1.5">
                {[
                  ['Podwykonawca', `${detail.podwykonawca_nazwa}${detail.podwykonawca_specjalizacja ? ` (${detail.podwykonawca_specjalizacja})` : ''}`],
                  ['Data podpisania', detail.data_podpisania ? new Date(detail.data_podpisania).toLocaleDateString('pl-PL') : '—'],
                  ['Warunki płatności', detail.warunki_platnosci || '—'],
                  ['Uwagi', detail.uwagi || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-white/50 text-sm">{label}</span>
                    <span className="text-white/90 text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Załącznik cennikowy */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">
                Załącznik cennikowy ({detail.pozycje.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs uppercase">
                      <th className="text-left py-2 px-2">Pozycja</th>
                      <th className="text-right py-2 px-2">Jedn.</th>
                      <th className="text-right py-2 px-2">Ilość</th>
                      <th className="text-right py-2 px-2">Stawka</th>
                      <th className="text-right py-2 px-2">Wartość</th>
                      <th className="text-right py-2 px-2">Wykonano</th>
                      <th className="text-right py-2 px-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.pozycje.map((p) => (
                      <>
                        <tr
                          key={p.id}
                          className={cn(
                            'border-t border-white/[0.06]',
                            detail.status === 'podpisana' && 'cursor-pointer hover:bg-white/5'
                          )}
                          onClick={() => handlePozycjaClick(p)}
                        >
                          <td className="py-2 px-2 text-white/80">{p.nazwa}</td>
                          <td className="py-2 px-2 text-right text-white/50">{p.jednostka || '—'}</td>
                          <td className="py-2 px-2 text-right text-white/60">{p.ilosc}</td>
                          <td className="py-2 px-2 text-right text-white/60">{fmt.format(p.stawka)}</td>
                          <td className="py-2 px-2 text-right text-white/80">{fmt.format(p.wartosc)} zł</td>
                          <td className="py-2 px-2 text-right text-white/50">{p.ilosc_wykonana}/{p.ilosc}</td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <div className="w-10 h-1.5 rounded bg-white/10">
                                <div
                                  className="h-full rounded bg-emerald-500"
                                  style={{ width: `${Math.min(p.procent_wykonania, 100)}%` }}
                                />
                              </div>
                              <span className="text-white/50 text-xs w-8 text-right">{p.procent_wykonania}%</span>
                            </div>
                          </td>
                        </tr>
                        {selectedPozycjaId === p.id && (
                          <tr key={`${p.id}-form`}>
                            <td colSpan={7} className="p-0">
                              <WykonanieForm
                                pozycja={p}
                                onSubmit={handleWykonanieSubmit}
                                onCancel={() => setSelectedPozycjaId(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Akcje */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Akcje</h4>
              <div className="flex gap-2">
                {detail.status === 'draft' && (
                  <>
                    <Button
                      onClick={() => handleStatusChange('wyslana')}
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
                {detail.status === 'wyslana' && (
                  <Button
                    onClick={() => handleStatusChange('podpisana')}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                    size="sm"
                  >
                    <Pen className="h-4 w-4 mr-1.5" />
                    Oznacz jako podpisaną
                  </Button>
                )}
                {detail.status === 'podpisana' && detail.avg_procent_wykonania > 0 && (
                  <Button
                    onClick={() => handleStatusChange('wykonana')}
                    variant="ghost"
                    size="sm"
                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Oznacz jako wykonaną
                  </Button>
                )}
                {detail.status === 'wykonana' && (
                  <Button
                    onClick={() => handleStatusChange('rozliczona')}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white/80"
                  >
                    Rozlicz
                  </Button>
                )}
              </div>
            </section>
          </>
        )}
      </SlidePanelContent>
    </SlidePanel>
  );
}
