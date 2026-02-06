'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import { getProjekt, type ProjektBase } from '@/actions/projekty';
import { getRewizje, type RewizjaBase } from '@/actions/rewizje';
import { StatusBadge } from '../projekty-table';

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

  useEffect(() => {
    if (open && projektId) {
      setLoading(true);
      Promise.all([
        getProjekt(projektId),
        getRewizje(projektId),
      ]).then(([p, r]) => {
        setProjekt(p);
        setRewizje(r);
      }).catch(() => {
        setProjekt(null);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open, projektId]);

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

            {/* Section 2: Rewizje - placeholder until PROJ-008 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Rewizje ({rewizje.length})
              </h4>
              {rewizje.length === 0 ? (
                <p className="text-sm text-white/50">Brak rewizji</p>
              ) : (
                <p className="text-sm text-white/50">
                  {rewizje.length} {rewizje.length === 1 ? 'rewizja' : rewizje.length < 5 ? 'rewizje' : 'rewizji'}
                </p>
              )}
            </div>

            {/* Action button placeholder */}
            <div>
              <Button disabled className="w-full bg-white/5 text-white/30 border border-white/10">
                Otwórz kosztorys
              </Button>
            </div>
          </>
        ) : null}
      </SlidePanelContent>
    </SlidePanel>
  );
}
