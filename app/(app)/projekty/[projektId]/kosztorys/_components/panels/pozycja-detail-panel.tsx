'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import {
  getKosztorysPozycjaDetail,
  updateKosztorysPozycja,
  updateKosztorysSkladowaR,
  updateKosztorysSkladowaM,
  resetSkladowaR,
  resetSkladowaM,
  type KosztorysPozycjaDetail as DetailType,
  type BibliotekaSkladowaR,
  type BibliotekaSkladowaM,
} from '@/actions/kosztorys';
import { OverrideIndicator } from '../override-indicator';
import { useRouter } from 'next/navigation';

interface PozycjaDetailPanelProps {
  pozycjaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLocked: boolean;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' zł';
}

export function PozycjaDetailPanel({
  pozycjaId,
  open,
  onOpenChange,
  isLocked,
  onDelete,
}: PozycjaDetailPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DetailType | null>(null);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [nazwa, setNazwa] = useState('');
  const [ilosc, setIlosc] = useState(0);
  const [jednostka, setJednostka] = useState('');
  const [narzut, setNarzut] = useState(0);

  const refreshDetail = async () => {
    if (!pozycjaId) return;
    const result = await getKosztorysPozycjaDetail(pozycjaId);
    if (result.success && result.data) {
      setDetail(result.data);
    }
  };

  useEffect(() => {
    if (!pozycjaId || !open) {
      setDetail(null);
      return;
    }

    setLoading(true);
    getKosztorysPozycjaDetail(pozycjaId).then((result) => {
      if (result.success && result.data) {
        setDetail(result.data);
        setNazwa(result.data.pozycja.nazwa);
        setIlosc(result.data.pozycja.ilosc);
        setJednostka(result.data.pozycja.jednostka || '');
        setNarzut(result.data.pozycja.narzut_percent);
      }
    }).finally(() => setLoading(false));
  }, [pozycjaId, open]);

  const handleSave = async () => {
    if (!pozycjaId) return;
    setSaving(true);
    try {
      const result = await updateKosztorysPozycja(pozycjaId, {
        nazwa,
        ilosc,
        jednostka: jednostka || undefined,
        narzut_percent: narzut,
      });
      if (result.success) {
        toast.success('Zapisano zmiany');
        router.refresh();
      } else {
        toast.error(result.error || 'Błąd zapisu');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSkladowaRBlur = async (id: string, stawka: number, podwykonawcaId: string | null) => {
    const result = await updateKosztorysSkladowaR(id, {
      stawka,
      podwykonawca_id: podwykonawcaId,
    });
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd zapisu');
    }
  };

  const handleSkladowaMBlur = async (id: string, cena: number, dostawcaId: string | null) => {
    const result = await updateKosztorysSkladowaM(id, {
      cena,
      dostawca_id: dostawcaId,
    });
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd zapisu');
    }
  };

  // Calculate totals
  const rJednostkowy = detail
    ? detail.skladoweR
        .filter((r) => !r.is_manual)
        .reduce((sum, r) => sum + r.stawka * r.norma, 0)
    : 0;
  const mJednostkowy = detail
    ? detail.skladoweM
        .filter((m) => !m.is_manual)
        .reduce((sum, m) => sum + m.cena * m.norma, 0)
    : 0;
  const rPlusM = (rJednostkowy + mJednostkowy) * ilosc;
  const narzutWartosc = rPlusM * (narzut / 100);
  const razem = rPlusM + narzutWartosc;

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="wide">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        {loading ? (
          <SlidePanelTitle>Ładowanie...</SlidePanelTitle>
        ) : detail ? (
          <>
            <div className="flex items-center gap-3">
              <SlidePanelTitle>Pozycja #{detail.pozycja.lp}</SlidePanelTitle>
            </div>
            <SlidePanelDescription>
              {detail.pozycja.kod && (
                <span className="font-mono text-xs text-white/40">{detail.pozycja.kod}</span>
              )}
            </SlidePanelDescription>
          </>
        ) : (
          <SlidePanelTitle>Nie znaleziono pozycji</SlidePanelTitle>
        )}
      </SlidePanelHeader>

      <SlidePanelContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : detail ? (
          <>
            {/* Position fields */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">Dane pozycji</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nazwa</label>
                  <Input
                    value={nazwa}
                    onChange={(e) => setNazwa(e.target.value)}
                    disabled={isLocked}
                    className="bg-white/[0.03] border-white/[0.08]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Ilość</label>
                    <Input
                      type="number"
                      value={ilosc}
                      onChange={(e) => setIlosc(Number(e.target.value))}
                      disabled={isLocked}
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Jedn.</label>
                    <Input
                      value={jednostka}
                      onChange={(e) => setJednostka(e.target.value)}
                      disabled={isLocked}
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Narzut %</label>
                    <Input
                      type="number"
                      value={narzut}
                      onChange={(e) => setNarzut(Number(e.target.value))}
                      disabled={isLocked}
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Robocizna */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Robocizna ({detail.skladoweR.length})
              </h4>
              <div className="space-y-2">
                {detail.skladoweR.map((r) => {
                  const libR = detail.bibliotekaSkladoweR.find((l) => l.lp === r.lp);
                  return (
                    <SkladowaRRow
                      key={r.id}
                      skladowa={r}
                      podwykonawcy={detail.podwykonawcy}
                      isLocked={isLocked}
                      onSave={handleSkladowaRBlur}
                      libSkladowa={libR}
                      onRefresh={refreshDetail}
                    />
                  );
                })}
              </div>
              <div className="text-right text-sm text-white/60 pr-2">
                Σ R jednostkowy: <span className="font-semibold text-white/80">{formatCurrency(rJednostkowy)}</span>
              </div>
            </div>

            {/* Materiały */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Materiały ({detail.skladoweM.length})
              </h4>
              <div className="space-y-2">
                {detail.skladoweM.map((m) => {
                  const libM = detail.bibliotekaSkladoweM.find((l) => l.lp === m.lp);
                  return (
                    <SkladowaMRow
                      key={m.id}
                      skladowa={m}
                      dostawcy={detail.dostawcy}
                      isLocked={isLocked}
                      onSave={handleSkladowaMBlur}
                      libSkladowa={libM}
                      onRefresh={refreshDetail}
                    />
                  );
                })}
              </div>
              <div className="text-right text-sm text-white/60 pr-2">
                Σ M jednostkowy: <span className="font-semibold text-white/80">{formatCurrency(mJednostkowy)}</span>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">R + M</span>
                <span className="text-white/80">{formatCurrency(rPlusM)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Narzut ({narzut}%)</span>
                <span className="text-white/80">{formatCurrency(narzutWartosc)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Cena/jedn.</span>
                <span className="text-white/80">{ilosc > 0 ? formatCurrency(razem / ilosc) : '—'}</span>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-white/[0.06] pt-2">
                <span className="text-white/70">WARTOŚĆ</span>
                <span className="text-amber-500">{formatCurrency(razem)}</span>
              </div>
            </div>

            {/* Actions */}
            {!isLocked && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-medium"
                >
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onDelete(detail.pozycja.id)}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : null}
      </SlidePanelContent>
    </SlidePanel>
  );
}

// --- Składowa R inline row ---

function SkladowaRRow({
  skladowa,
  podwykonawcy,
  isLocked,
  onSave,
  libSkladowa,
  onRefresh,
}: {
  skladowa: DetailType['skladoweR'][0];
  podwykonawcy: { id: string; nazwa: string }[];
  isLocked: boolean;
  onSave: (id: string, stawka: number, podwykonawcaId: string | null) => void;
  libSkladowa?: BibliotekaSkladowaR;
  onRefresh: () => Promise<void>;
}) {
  const [stawka, setStawka] = useState(skladowa.stawka);
  const [podId, setPodId] = useState(skladowa.podwykonawca_id || '_none');
  const router = useRouter();

  // Update local state when detail refreshes
  useEffect(() => {
    setStawka(skladowa.stawka);
    setPodId(skladowa.podwykonawca_id || '_none');
  }, [skladowa.stawka, skladowa.podwykonawca_id]);

  const isStawkaOverridden = libSkladowa
    ? skladowa.stawka !== libSkladowa.stawka_domyslna
    : false;

  const handleResetStawka = async () => {
    if (!libSkladowa) return;
    const result = await resetSkladowaR(skladowa.id, libSkladowa.stawka_domyslna);
    if (result.success) {
      setStawka(libSkladowa.stawka_domyslna);
      router.refresh();
      await onRefresh();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.02] border border-white/[0.05]">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/70 truncate">{skladowa.opis}</div>
        <div className="text-xs text-white/30">norma: {skladowa.norma} {skladowa.jednostka}</div>
      </div>
      <div className="flex items-center">
        <Input
          type="number"
          value={stawka}
          onChange={(e) => setStawka(Number(e.target.value))}
          onBlur={() => onSave(skladowa.id, stawka, podId === '_none' ? null : podId)}
          disabled={isLocked}
          className="w-[90px] h-7 text-right bg-white/[0.03] border-white/[0.08] text-sm"
        />
        <OverrideIndicator
          isOverridden={isStawkaOverridden}
          libraryValue={libSkladowa?.stawka_domyslna ?? 0}
          onReset={handleResetStawka}
          disabled={isLocked}
        />
      </div>
      <Select
        value={podId}
        onValueChange={(val) => {
          setPodId(val);
          onSave(skladowa.id, stawka, val === '_none' ? null : val);
        }}
        disabled={isLocked}
      >
        <SelectTrigger className="w-[140px] h-7 bg-white/[0.03] border-white/[0.08] text-xs">
          <SelectValue placeholder="Podwykonawca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— Brak —</SelectItem>
          {podwykonawcy.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.nazwa}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// --- Składowa M inline row ---

function SkladowaMRow({
  skladowa,
  dostawcy,
  isLocked,
  onSave,
  libSkladowa,
  onRefresh,
}: {
  skladowa: DetailType['skladoweM'][0];
  dostawcy: { id: string; nazwa: string }[];
  isLocked: boolean;
  onSave: (id: string, cena: number, dostawcaId: string | null) => void;
  libSkladowa?: BibliotekaSkladowaM;
  onRefresh: () => Promise<void>;
}) {
  const [cena, setCena] = useState(skladowa.cena);
  const [dosId, setDosId] = useState(skladowa.dostawca_id || '_none');
  const router = useRouter();

  useEffect(() => {
    setCena(skladowa.cena);
    setDosId(skladowa.dostawca_id || '_none');
  }, [skladowa.cena, skladowa.dostawca_id]);

  const isCenaOverridden = libSkladowa
    ? skladowa.cena !== libSkladowa.cena_domyslna
    : false;

  const handleResetCena = async () => {
    if (!libSkladowa) return;
    const result = await resetSkladowaM(skladowa.id, libSkladowa.cena_domyslna);
    if (result.success) {
      setCena(libSkladowa.cena_domyslna);
      router.refresh();
      await onRefresh();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.02] border border-white/[0.05]">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/70 truncate">{skladowa.nazwa}</div>
        <div className="text-xs text-white/30">norma: {skladowa.norma} {skladowa.jednostka || ''}</div>
      </div>
      <div className="flex items-center">
        <Input
          type="number"
          value={cena}
          onChange={(e) => setCena(Number(e.target.value))}
          onBlur={() => onSave(skladowa.id, cena, dosId === '_none' ? null : dosId)}
          disabled={isLocked}
          className="w-[90px] h-7 text-right bg-white/[0.03] border-white/[0.08] text-sm"
        />
        <OverrideIndicator
          isOverridden={isCenaOverridden}
          libraryValue={libSkladowa?.cena_domyslna ?? 0}
          onReset={handleResetCena}
          disabled={isLocked}
        />
      </div>
      <Select
        value={dosId}
        onValueChange={(val) => {
          setDosId(val);
          onSave(skladowa.id, cena, val === '_none' ? null : val);
        }}
        disabled={isLocked}
      >
        <SelectTrigger className="w-[140px] h-7 bg-white/[0.03] border-white/[0.08] text-xs">
          <SelectValue placeholder="Dostawca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— Brak —</SelectItem>
          {dostawcy.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.nazwa}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
