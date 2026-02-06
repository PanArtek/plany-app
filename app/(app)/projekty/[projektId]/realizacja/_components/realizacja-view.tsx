'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RealizacjaStats, RealizacjaWpisRow } from '@/actions/realizacja';
import { toggleOplacone } from '@/actions/realizacja';
import { RealizacjaSidebar } from './realizacja-sidebar';
import { WpisyTable } from './wpisy-table';
import { WpisyEmpty } from './wpisy-empty';
import { WpisFormPanel } from './panels/wpis-form-panel';
import { WpisDetailPanel } from './panels/wpis-detail-panel';
import { toast } from 'sonner';

interface RealizacjaViewProps {
  stats: RealizacjaStats;
  wpisy: RealizacjaWpisRow[];
  projektId: string;
  zamowieniaList: { id: string; numer: string }[];
  umowyList: { id: string; numer: string }[];
}

export function RealizacjaView({ stats, wpisy, projektId, zamowieniaList, umowyList }: RealizacjaViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Panel state
  const [formPanelOpen, setFormPanelOpen] = useState(false);
  const [formPanelWpisId, setFormPanelWpisId] = useState<string | null>(null);
  const [detailPanelWpisId, setDetailPanelWpisId] = useState<string | null>(null);

  // Filter state
  const [filterTyp, setFilterTyp] = useState<string | null>(null);
  const [filterOplacone, setFilterOplacone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Client-side filtering
  const filteredWpisy = useMemo(() => {
    let result = wpisy;

    if (filterTyp) {
      result = result.filter((w) => w.typ === filterTyp);
    }

    if (filterOplacone === 'oplacone') {
      result = result.filter((w) => w.oplacone);
    } else if (filterOplacone === 'nieoplacone') {
      result = result.filter((w) => !w.oplacone);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (w) =>
          (w.opis && w.opis.toLowerCase().includes(q)) ||
          (w.numer_faktury && w.numer_faktury.toLowerCase().includes(q))
      );
    }

    return result;
  }, [wpisy, filterTyp, filterOplacone, debouncedSearch]);

  // Handlers
  const handleToggleOplacone = (id: string, value: boolean) => {
    startTransition(async () => {
      const result = await toggleOplacone(id, projektId, value);
      if (!result.success) toast.error(result.error || 'Błąd zmiany statusu');
    });
  };

  const handleRowClick = (id: string) => {
    setDetailPanelWpisId(id);
  };

  const handleAddClick = () => {
    setFormPanelWpisId(null);
    setFormPanelOpen(true);
  };

  const handleEdit = (id: string) => {
    setDetailPanelWpisId(null);
    setFormPanelWpisId(id);
    setFormPanelOpen(true);
  };

  const handleFormClose = () => {
    setFormPanelOpen(false);
    setFormPanelWpisId(null);
    router.refresh();
  };

  const handleDetailClose = () => {
    setDetailPanelWpisId(null);
  };

  return (
    <div className="flex gap-6 p-6">
      {/* Sidebar */}
      <div className="w-80 shrink-0 space-y-4 sticky top-0 self-start">
        <RealizacjaSidebar stats={stats} projektId={projektId} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <Select value={filterTyp || 'all'} onValueChange={(v) => setFilterTyp(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="material">Materiał</SelectItem>
              <SelectItem value="robocizna">Robocizna</SelectItem>
              <SelectItem value="inny">Inny</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterOplacone || 'all'} onValueChange={(v) => setFilterOplacone(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Opłacone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="oplacone">Opłacone</SelectItem>
              <SelectItem value="nieoplacone">Nieopłacone</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Szukaj..."
              className="pl-9"
            />
          </div>

          <Button onClick={handleAddClick} className="bg-amber-600 hover:bg-amber-500 text-white ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj wpis
          </Button>
        </div>

        {/* Table or Empty */}
        {wpisy.length === 0 ? (
          <WpisyEmpty onAddClick={handleAddClick} />
        ) : (
          <WpisyTable
            wpisy={filteredWpisy}
            onRowClick={handleRowClick}
            onToggleOplacone={handleToggleOplacone}
          />
        )}
      </div>

      {/* Panels */}
      <WpisFormPanel
        open={formPanelOpen}
        onClose={handleFormClose}
        projektId={projektId}
        wpisId={formPanelWpisId}
        wpisy={wpisy}
        zamowieniaList={zamowieniaList}
        umowyList={umowyList}
      />

      <WpisDetailPanel
        open={detailPanelWpisId !== null}
        onClose={handleDetailClose}
        wpisId={detailPanelWpisId}
        wpisy={wpisy}
        onEdit={handleEdit}
        projektId={projektId}
      />
    </div>
  );
}
