'use client';

import { useState, useEffect, useTransition } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  SlidePanelContent,
} from '@/components/ui/slide-panel';
import {
  getLibraryPositions,
  addPositionFromLibrary,
  type LibraryPosition,
} from '@/actions/kosztorys';
import { useRouter } from 'next/navigation';

const BRANZA_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'BUD', label: 'BUD — Budowlana' },
  { value: 'ELE', label: 'ELE — Elektryczna' },
  { value: 'SAN', label: 'SAN — Sanitarna' },
  { value: 'TEL', label: 'TEL — Telekomunikacyjna' },
  { value: 'HVC', label: 'HVC — Klimatyzacja' },
];

interface AddFromLibraryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewizjaId: string;
  existingPozycjaBibliotekaIds: string[];
  isLocked: boolean;
}

export function AddFromLibraryPanel({
  open,
  onOpenChange,
  rewizjaId,
  existingPozycjaBibliotekaIds,
}: AddFromLibraryPanelProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [branza, setBranza] = useState('all');
  const [positions, setPositions] = useState<LibraryPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch('');
      setBranza('all');
      return;
    }

    setLoading(true);
    const filters = {
      search: search || undefined,
      branza: branza !== 'all' ? branza : undefined,
      page: 1,
    };

    getLibraryPositions(filters).then((result) => {
      if (result.success && result.data) {
        setPositions(result.data.data);
      }
    }).finally(() => setLoading(false));
  }, [open, search, branza]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    startTransition(async () => {
      let added = 0;
      for (const id of selected) {
        const result = await addPositionFromLibrary(rewizjaId, id);
        if (result.success) added++;
      }
      toast.success(`Dodano ${added} pozycji do kosztorysu`);
      setSelected(new Set());
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="wide">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>Dodaj pozycje z biblioteki</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              placeholder="Szukaj pozycji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-white/[0.03] border-white/[0.08]"
            />
          </div>
          <Select value={branza} onValueChange={setBranza}>
            <SelectTrigger className="w-[200px] h-9 bg-white/[0.03] border-white/[0.08]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANZA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/50" />
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm">
              Brak pozycji w bibliotece
            </div>
          ) : (
            positions.map((pos) => {
              const isExisting = existingPozycjaBibliotekaIds.includes(pos.id);
              return (
                <label
                  key={pos.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(pos.id)}
                    onCheckedChange={() => toggleSelect(pos.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white/40">{pos.kod}</span>
                      <span className="text-sm text-white/80 truncate">{pos.nazwa}</span>
                      {isExisting && (
                        <span className="text-xs text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded">
                          Dodano
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      R: {pos.skladoweRCount} składowe &nbsp; M: {pos.skladoweMCount} składowe
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <span className="text-sm text-white/50">Wybrano: {selected.size}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-white/[0.08]"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selected.size === 0 || isPending}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                `Dodaj wybrane (${selected.size})`
              )}
            </Button>
          </div>
        </div>
      </SlidePanelContent>
    </SlidePanel>
  );
}
