'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2, RotateCcw } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  getKosztorysPozycjaDetail,
  updateKosztorysPozycja,
  updateCenaRobocizny,
  updateKosztorysSkladowaM,
  resetSkladowaM,
  resetPozycjaToLibrary,
  type KosztorysPozycjaDetail as DetailType,
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

  // Robocizna editing state
  const [cenaR, setCenaR] = useState(0);
  const [podwykonawcaId, setPodwykonawcaId] = useState<string>('_none');

  const refreshDetail = async () => {
    if (!pozycjaId) return;
    const result = await getKosztorysPozycjaDetail(pozycjaId);
    if (result.success && result.data) {
      setDetail(result.data);
      setCenaR(result.data.pozycja.cena_robocizny);
      setPodwykonawcaId(result.data.pozycja.podwykonawca_id || '_none');
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
        setCenaR(result.data.pozycja.cena_robocizny);
        setPodwykonawcaId(result.data.pozycja.podwykonawca_id || '_none');
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

  const handleCenaRobociznyBlur = async () => {
    if (!pozycjaId || !detail) return;
    if (cenaR === detail.pozycja.cena_robocizny &&
        (podwykonawcaId === '_none' ? null : podwykonawcaId) === detail.pozycja.podwykonawca_id) return;
    const result = await updateCenaRobocizny(pozycjaId, {
      cena_robocizny: cenaR,
      podwykonawca_id: podwykonawcaId === '_none' ? null : podwykonawcaId,
    });
    if (result.success) {
      router.refresh();
      await refreshDetail();
    } else {
      toast.error(result.error || 'Błąd zapisu robocizny');
    }
  };

  const handlePodwykonawcaChange = async (val: string) => {
    setPodwykonawcaId(val);
    if (!pozycjaId) return;
    const result = await updateCenaRobocizny(pozycjaId, {
      cena_robocizny: cenaR,
      podwykonawca_id: val === '_none' ? null : val,
    });
    if (result.success) {
      router.refresh();
      await refreshDetail();
    } else {
      toast.error(result.error || 'Błąd zapisu');
    }
  };

  // Calculate totals
  const rJednostkowy = detail
    ? cenaR
    : 0;
  const mJednostkowy = detail
    ? detail.skladoweM
        .filter((m) => !m.is_manual)
        .reduce((sum, m) => sum + m.cena * m.norma, 0)
    : 0;
  const rPlusM = (rJednostkowy + mJednostkowy) * ilosc;
  const narzutWartosc = rPlusM * (narzut / 100);
  const razem = rPlusM + narzutWartosc;

  // Check if any skladowe have overrides (differ from library)
  // For robocizna: check cena_robocizny vs cena_robocizny_zrodlowa
  const hasRobociznaOverride = detail
    ? (detail.pozycja.cena_robocizny_zrodlowa !== null &&
       detail.pozycja.cena_robocizny !== detail.pozycja.cena_robocizny_zrodlowa)
    : false;
  const hasOverrides = detail ? (
    hasRobociznaOverride ||
    detail.skladoweM.some((m) => {
      const lib = detail.bibliotekaSkladoweM.find((l) => l.lp === m.lp);
      return lib && m.cena !== lib.cena_domyslna;
    })
  ) : false;

  const [resetting, setResetting] = useState(false);

  const handleResetAll = async () => {
    if (!pozycjaId) return;
    setResetting(true);
    try {
      const result = await resetPozycjaToLibrary(pozycjaId);
      if (result.success) {
        toast.success('Zresetowano do wartości z biblioteki');
        router.refresh();
        await refreshDetail();
      } else {
        toast.error(result.error || 'Błąd resetowania');
      }
    } finally {
      setResetting(false);
    }
  };

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

            {/* Robocizna (flat cena) — editable */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Robocizna
                </h4>
                {detail.pozycja.cena_robocizny_zrodlo && (
                  <Badge
                    variant="outline"
                    className={
                      detail.pozycja.cena_robocizny_zrodlo === 'biblioteka'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]'
                        : detail.pozycja.cena_robocizny_zrodlo === 'podwykonawca'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 text-[10px]'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]'
                    }
                  >
                    {{ biblioteka: 'Biblioteka', podwykonawca: 'Podwykonawca', reczna: 'Ręczna' }[detail.pozycja.cena_robocizny_zrodlo] || detail.pozycja.cena_robocizny_zrodlo}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.02] border border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/70">Cena robocizny za jm</div>
                  {hasRobociznaOverride && detail.pozycja.cena_robocizny_zrodlowa !== null && (
                    <div className="text-xs text-white/30 line-through">
                      {formatCurrency(detail.pozycja.cena_robocizny_zrodlowa)}
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cenaR}
                    onChange={(e) => setCenaR(Number(e.target.value))}
                    onBlur={handleCenaRobociznyBlur}
                    disabled={isLocked}
                    className="w-[100px] h-7 text-right bg-white/[0.03] border-white/[0.08] text-sm font-mono"
                  />
                  <OverrideIndicator
                    isOverridden={hasRobociznaOverride}
                    libraryValue={detail.pozycja.cena_robocizny_zrodlowa ?? 0}
                    onReset={async () => {
                      if (!pozycjaId) return;
                      const result = await resetPozycjaToLibrary(pozycjaId);
                      if (result.success) {
                        router.refresh();
                        await refreshDetail();
                      }
                    }}
                    disabled={isLocked}
                  />
                </div>
                <Select
                  value={podwykonawcaId}
                  onValueChange={handlePodwykonawcaChange}
                  disabled={isLocked}
                >
                  <SelectTrigger className="w-[140px] h-7 bg-white/[0.03] border-white/[0.08] text-xs">
                    <SelectValue placeholder="Podwykonawca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Brak —</SelectItem>
                    {detail.podwykonawcy.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nazwa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Reset to library */}
            {!isLocked && hasOverrides && detail.pozycja.pozycja_biblioteka_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={resetting}
                    className="w-full text-white/60 border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {resetting ? 'Resetowanie...' : 'Resetuj do biblioteki'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resetuj do biblioteki</AlertDialogTitle>
                    <AlertDialogDescription>
                      Czy na pewno chcesz zresetować wszystkie wartości do aktualnych wartości z biblioteki?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetAll}>
                      Resetuj
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

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

// --- Skladowa M inline row ---

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
