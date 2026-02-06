'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Loader2, Lock, Unlock, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import { getProjekt, type ProjektBase } from '@/actions/projekty';
import { getRewizje, createRewizja, lockRewizja, unlockRewizja, type RewizjaBase } from '@/actions/rewizje';
import { StatusBadge } from '../projekty-table';
import { cn } from '@/lib/utils';

interface ProjektDetailPanelProps {
  projektId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjektDetailPanel({
  projektId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ProjektDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [projekt, setProjekt] = useState<ProjektBase | null>(null);
  const [rewizje, setRewizje] = useState<RewizjaBase[]>([]);
  const [selectedRewizjaId, setSelectedRewizjaId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedRewizja = rewizje.find((r) => r.id === selectedRewizjaId) || null;

  useEffect(() => {
    if (open && projektId) {
      setLoading(true);
      setSelectedRewizjaId(null);
      Promise.all([
        getProjekt(projektId),
        getRewizje(projektId),
      ]).then(([p, r]) => {
        setProjekt(p);
        setRewizje(r);
        // Auto-select latest revision
        if (r.length > 0) {
          setSelectedRewizjaId(r[r.length - 1].id);
        }
      }).catch(() => {
        setProjekt(null);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open, projektId]);

  const refreshRewizje = async () => {
    if (!projektId) return;
    const r = await getRewizje(projektId);
    setRewizje(r);
    return r;
  };

  const handleCreateRewizja = async () => {
    if (!projektId) return;
    setActionLoading(true);
    try {
      const result = await createRewizja(projektId);
      if (result.success && result.data) {
        await refreshRewizje();
        setSelectedRewizjaId(result.data.id);
        toast.success(`Utworzono rewizję R${result.data.numer}`);
      } else {
        toast.error(result.error || 'Błąd tworzenia rewizji');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedRewizja) return;
    setActionLoading(true);
    try {
      const result = selectedRewizja.is_locked
        ? await unlockRewizja(selectedRewizja.id)
        : await lockRewizja(selectedRewizja.id);

      if (result.success) {
        await refreshRewizje();
        toast.success(selectedRewizja.is_locked ? 'Odblokowano rewizję' : 'Zablokowano rewizję');
      } else {
        toast.error(result.error || 'Błąd zmiany stanu rewizji');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="wide">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        {loading ? (
          <SlidePanelTitle>Ładowanie...</SlidePanelTitle>
        ) : projekt ? (
          <>
            <div className="flex items-center gap-3">
              <SlidePanelTitle>{projekt.nazwa}</SlidePanelTitle>
              <StatusBadge status={projekt.status} />
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
          <SlidePanelTitle>Nie znaleziono projektu</SlidePanelTitle>
        )}
      </SlidePanelHeader>

      <SlidePanelContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : projekt ? (
          <>
            {/* Section 1: Dane projektu */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Dane projektu
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-sm text-white/50">Klient</span>
                  <span className="text-sm text-white/80">{projekt.klient || 'Brak'}</span>
                </div>
                <div className="flex justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-sm text-white/50">Adres</span>
                  <span className="text-sm text-white/80">{projekt.adres || 'Brak'}</span>
                </div>
                <div className="flex justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-sm text-white/50">Powierzchnia</span>
                  <span className="text-sm text-white/80">
                    {projekt.powierzchnia ? `${projekt.powierzchnia} m²` : 'Brak'}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-sm text-white/50">Utworzono</span>
                  <span className="text-sm text-white/80">
                    {new Date(projekt.created_at).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Rewizje */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Rewizje ({rewizje.length})
              </h4>

              {/* Revision badges */}
              {rewizje.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rewizje.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRewizjaId(r.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors",
                        r.id === selectedRewizjaId
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          : "bg-white/[0.03] text-white/60 border-white/[0.08] hover:bg-white/5 hover:text-white/80"
                      )}
                    >
                      R{r.numer}
                      {r.is_locked && <Lock className="h-3 w-3" />}
                      {r.is_accepted && <Check className="h-3 w-3 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected revision details */}
              {selectedRewizja && (
                <div className="space-y-2 px-3 py-3 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex justify-between">
                    <span className="text-sm text-white/50">Numer</span>
                    <span className="text-sm text-white/80 font-mono">R{selectedRewizja.numer}</span>
                  </div>
                  {selectedRewizja.nazwa && (
                    <div className="flex justify-between">
                      <span className="text-sm text-white/50">Nazwa</span>
                      <span className="text-sm text-white/80">{selectedRewizja.nazwa}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-white/50">Status</span>
                    <span className="text-sm text-white/80">
                      {selectedRewizja.is_accepted ? 'Zaakceptowana' : selectedRewizja.is_locked ? 'Zablokowana' : 'Otwarta'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/50">Utworzono</span>
                    <span className="text-sm text-white/80">
                      {new Date(selectedRewizja.created_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </div>
              )}

              {/* Revision actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateRewizja}
                  disabled={actionLoading}
                  className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nowa rewizja
                </Button>
                {selectedRewizja && !selectedRewizja.is_accepted && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleLock}
                    disabled={actionLoading}
                    className="text-white/60 border-white/10 hover:bg-white/5"
                  >
                    {selectedRewizja.is_locked ? (
                      <>
                        <Unlock className="h-3.5 w-3.5 mr-1.5" />
                        Odblokuj
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 mr-1.5" />
                        Zablokuj
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Kosztorys link */}
            <div>
              <Button asChild className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20">
                <a href={`/projekty/${projektId}/kosztorys`}>
                  Otwórz kosztorys
                </a>
              </Button>
            </div>
          </>
        ) : null}
      </SlidePanelContent>
    </SlidePanel>
  );
}
