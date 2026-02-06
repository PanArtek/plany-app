'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type KosztorysData, type KosztorysPozycjaView } from '@/actions/kosztorys';
import { RewizjaSelector } from './rewizja-selector';
import { KosztorysSidebar } from './kosztorys-sidebar';
import { KosztorysSummary } from './kosztorys-summary';
import { KosztorysTable } from './kosztorys-table';
import { LibraryDrawer } from './library-drawer';
import { PozycjaDetailPanel } from './panels/pozycja-detail-panel';
import { LockedBanner } from './locked-banner';
import { StatusBadge } from '@/app/(app)/projekty/_components/status-badge';
import { DeleteConfirmPanel } from '@/app/(app)/kategorie/_components/panels/delete-confirm-panel';
import { deleteKosztorysPozycje } from '@/actions/kosztorys';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface KosztorysViewProps {
  data: KosztorysData;
}

interface SidebarFilter {
  type: 'all' | 'branza' | 'kategoria';
  branzaKod?: string;
  kategoriaKod?: string;
}

export function KosztorysView({ data }: KosztorysViewProps) {
  const router = useRouter();
  const { projekt, rewizje, rewizja, pozycje } = data;

  const [detailPanelId, setDetailPanelId] = useState<string | null>(null);
  const [addFromLibraryOpen, setAddFromLibraryOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');

  const isLocked = rewizja.is_locked;

  // Ctrl+B / Cmd+B shortcut to toggle library drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (!isLocked) {
          setAddFromLibraryOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked]);

  // Filter pozycje based on sidebar filter and search
  const filteredPozycje = pozycje.filter((p: KosztorysPozycjaView) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.nazwa.toLowerCase().includes(q) && !(p.kod?.toLowerCase().includes(q))) {
        return false;
      }
    }
    // Sidebar filter
    if (sidebarFilter.type === 'all') return true;
    if (!p.kod) return false;
    if (sidebarFilter.type === 'branza' && sidebarFilter.branzaKod) {
      return p.kod.startsWith(sidebarFilter.branzaKod);
    }
    if (sidebarFilter.type === 'kategoria' && sidebarFilter.kategoriaKod) {
      return p.kod.startsWith(sidebarFilter.kategoriaKod);
    }
    return true;
  });

  const deleteTarget = deleteConfirmId
    ? pozycje.find((p: KosztorysPozycjaView) => p.id === deleteConfirmId)
    : null;

  const existingPozycjaBibliotekaIds = pozycje
    .map((p: KosztorysPozycjaView) => p.pozycja_biblioteka_id)
    .filter((id): id is string => id !== null);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const result = await deleteKosztorysPozycje([deleteConfirmId]);
    if (result.success) {
      toast.success('Pozycja usunięta');
      setDeleteConfirmId(null);
      setDetailPanelId(null);
      router.refresh();
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/projekty" className="text-white/50 hover:text-white/80 transition-colors">
            Projekty
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-white/30" />
          <Link href="/projekty" className="text-white/50 hover:text-white/80 transition-colors">
            {projekt.nazwa}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-white/30" />
          <span className="text-white/90 font-medium">Kosztorys</span>
          <StatusBadge status={projekt.status} />
        </div>
        <div className="flex items-center gap-3">
          <RewizjaSelector
            rewizje={rewizje}
            activeRewizjaId={rewizja.id}
            projektId={projekt.id}
          />
          {!isLocked && (
            <Button
              onClick={() => setAddFromLibraryOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Dodaj pozycję
            </Button>
          )}
        </div>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <LockedBanner rewizja={rewizja} isAccepted={rewizja.is_accepted} />
      )}

      {/* Main content: sidebar + table + detail */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <KosztorysSidebar
          pozycje={pozycje}
          activeFilter={sidebarFilter}
          onFilterChange={setSidebarFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
          <KosztorysSummary
            pozycje={filteredPozycje}
            powierzchnia={projekt.powierzchnia}
          />
          <KosztorysTable
            pozycje={filteredPozycje}
            selectedId={detailPanelId}
            onSelect={(id) => setDetailPanelId(id)}
            isLocked={isLocked}
          />
        </div>
      </div>

      {/* Panels */}
      <LibraryDrawer
        open={addFromLibraryOpen}
        onOpenChange={setAddFromLibraryOpen}
        rewizjaId={rewizja.id}
        existingPozycjaBibliotekaIds={existingPozycjaBibliotekaIds}
        isLocked={isLocked}
      />

      <PozycjaDetailPanel
        pozycjaId={detailPanelId}
        open={detailPanelId !== null}
        onOpenChange={(open) => { if (!open) setDetailPanelId(null); }}
        isLocked={isLocked}
        onDelete={(id) => setDeleteConfirmId(id)}
      />

      <DeleteConfirmPanel
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        itemName={deleteTarget?.nazwa || ''}
        onConfirm={handleDelete}
      />
    </div>
  );
}
