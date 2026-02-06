'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  getLibraryPositions,
  getKategorieForFilter,
  addPositionFromLibrary,
  type LibraryPosition,
  type KategoriaFilter,
} from '@/actions/kosztorys';
import { useRouter } from 'next/navigation';

const BRANZA_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'BUD', label: 'BUD' },
  { value: 'ELE', label: 'ELE' },
  { value: 'SAN', label: 'SAN' },
  { value: 'TEL', label: 'TEL' },
  { value: 'HVC', label: 'HVC' },
];

interface LibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewizjaId: string;
  existingPozycjaBibliotekaIds: string[];
  isLocked: boolean;
}

export function LibraryDrawer({
  open,
  onOpenChange,
  rewizjaId,
  existingPozycjaBibliotekaIds,
  isLocked,
}: LibraryDrawerProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [branza, setBranza] = useState('all');
  const [kategoriaId, setKategoriaId] = useState<string>('all');
  const [podkategoriaId, setPodkategoriaId] = useState<string>('all');

  const [kategorie, setKategorie] = useState<KategoriaFilter[]>([]);
  const [podkategorie, setPodkategorie] = useState<KategoriaFilter[]>([]);

  const [positions, setPositions] = useState<LibraryPosition[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch('');
      setBranza('all');
      setKategoriaId('all');
      setPodkategoriaId('all');
      setKategorie([]);
      setPodkategorie([]);
      setPositions([]);
      setPage(1);
    }
  }, [open]);

  // Fetch kategorie when branza changes
  useEffect(() => {
    if (branza === 'all') {
      setKategorie([]);
      setKategoriaId('all');
      setPodkategorie([]);
      setPodkategoriaId('all');
      return;
    }

    // Fetch top-level kategorie for this branza
    // Use the branza code to find parent kategoria, then its children
    getKategorieForFilter().then((result) => {
      if (result.success && result.data) {
        // Find the branza kategoria (poziom=0) matching the code
        const branzaKat = result.data.find((k) => k.kod === branza);
        if (branzaKat) {
          getKategorieForFilter(branzaKat.id).then((childResult) => {
            if (childResult.success && childResult.data) {
              setKategorie(childResult.data);
            }
          });
        }
      }
    });
    setKategoriaId('all');
    setPodkategorie([]);
    setPodkategoriaId('all');
  }, [branza]);

  // Fetch podkategorie when kategoria changes
  useEffect(() => {
    if (kategoriaId === 'all') {
      setPodkategorie([]);
      setPodkategoriaId('all');
      return;
    }

    getKategorieForFilter(kategoriaId).then((result) => {
      if (result.success && result.data) {
        setPodkategorie(result.data);
      }
    });
    setPodkategoriaId('all');
  }, [kategoriaId]);

  // Fetch positions
  const fetchPositions = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const result = await getLibraryPositions({
        search: search || undefined,
        branza: branza !== 'all' ? branza : undefined,
        kategoriaId: kategoriaId !== 'all' ? kategoriaId : undefined,
        podkategoriaId: podkategoriaId !== 'all' ? podkategoriaId : undefined,
        page: pageNum,
      });
      if (result.success && result.data) {
        if (append) {
          setPositions((prev) => [...prev, ...result.data!.data]);
        } else {
          setPositions(result.data.data);
        }
        setTotalCount(result.data.totalCount);
      }
    } finally {
      setLoading(false);
    }
  }, [search, branza, kategoriaId, podkategoriaId]);

  // Refetch when filters change
  useEffect(() => {
    if (!open) return;
    setPage(1);
    fetchPositions(1, false);
  }, [open, search, branza, kategoriaId, podkategoriaId, fetchPositions]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPositions(nextPage, true);
  };

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

  const hasMore = positions.length < totalCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[40vh] flex flex-col"
      >
        <SheetHeader className="flex-none pb-0">
          <SheetTitle>Biblioteka pozycji</SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="flex-none flex gap-2 px-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              placeholder="Szukaj..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] text-sm"
            />
          </div>
          <Select value={branza} onValueChange={setBranza}>
            <SelectTrigger className="w-[100px] h-8 bg-white/[0.03] border-white/[0.08] text-xs">
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
          {kategorie.length > 0 && (
            <Select value={kategoriaId} onValueChange={setKategoriaId}>
              <SelectTrigger className="w-[140px] h-8 bg-white/[0.03] border-white/[0.08] text-xs">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {kategorie.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.kod} — {k.nazwa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {podkategorie.length > 0 && (
            <Select value={podkategoriaId} onValueChange={setPodkategoriaId}>
              <SelectTrigger className="w-[160px] h-8 bg-white/[0.03] border-white/[0.08] text-xs">
                <SelectValue placeholder="Podkategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {podkategorie.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.kod} — {k.nazwa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-4 space-y-0.5 min-h-0">
          {loading && positions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              Brak pozycji
            </div>
          ) : (
            <>
              {positions.map((pos) => {
                const isExisting = existingPozycjaBibliotekaIds.includes(pos.id);
                return (
                  <label
                    key={pos.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(pos.id)}
                      onCheckedChange={() => toggleSelect(pos.id)}
                    />
                    <span className="font-mono text-xs text-white/40 w-[120px] shrink-0 truncate">
                      {pos.kod}
                    </span>
                    <span className="text-sm text-white/80 flex-1 truncate">
                      {pos.nazwa}
                    </span>
                    <span className="text-xs text-white/30 shrink-0">
                      {pos.jednostka}
                    </span>
                    <span className="text-xs text-white/30 shrink-0">
                      R:{pos.skladoweRCount} M:{pos.skladoweMCount}
                    </span>
                    {isExisting && (
                      <span className="text-xs text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded shrink-0">
                        Dodano
                      </span>
                    )}
                  </label>
                );
              })}
              {hasMore && (
                <div className="py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="text-white/50 hover:text-white/70"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : null}
                    Załaduj więcej
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="flex-none border-t border-white/[0.08]">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-white/50">
              {totalCount} pozycji &middot; Wybrano: {selected.size}
            </span>
            <Button
              onClick={handleAdd}
              disabled={selected.size === 0 || isPending || isLocked}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                `Dodaj ${selected.size} pozycji`
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
