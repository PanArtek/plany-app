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
        className="h-[55vh] flex flex-col"
      >
        <SheetHeader className="flex-none pb-1">
          <SheetTitle>
            Biblioteka pozycji
            {totalCount > 0 && (
              <span className="text-white/40 font-normal ml-2">({totalCount})</span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Filters — row 1: branża/kategoria/podkategoria, row 2: search */}
        <div className="flex-none space-y-1.5 px-4">
          <div className="flex gap-2">
            <Select value={branza} onValueChange={setBranza}>
              <SelectTrigger className="flex-1 h-8 bg-white/[0.03] border-white/[0.08] text-xs">
                <SelectValue placeholder="Branża" />
              </SelectTrigger>
              <SelectContent>
                {BRANZA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={kategoriaId}
              onValueChange={setKategoriaId}
              disabled={kategorie.length === 0}
            >
              <SelectTrigger className="flex-1 h-8 bg-white/[0.03] border-white/[0.08] text-xs disabled:opacity-40">
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
            <Select
              value={podkategoriaId}
              onValueChange={setPodkategoriaId}
              disabled={podkategorie.length === 0}
            >
              <SelectTrigger className="flex-1 h-8 bg-white/[0.03] border-white/[0.08] text-xs disabled:opacity-40">
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
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              placeholder="Szukaj po nazwie lub kodzie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] text-sm"
            />
          </div>
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
              {positions.map((pos, index) => {
                const isExisting = existingPozycjaBibliotekaIds.includes(pos.id);
                return (
                  <label
                    key={pos.id}
                    className={`grid items-center px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-white/[0.05] ${
                      index % 2 === 1 ? 'bg-white/[0.02]' : ''
                    }`}
                    style={{ gridTemplateColumns: '1.25rem 6.875rem minmax(0,32rem) 2rem 2.5rem 2.5rem 3.5rem' }}
                  >
                    <Checkbox
                      checked={selected.has(pos.id)}
                      onCheckedChange={() => toggleSelect(pos.id)}
                    />
                    <span className="font-mono text-xs text-white/50 truncate">
                      {pos.kod}
                    </span>
                    <span className="text-sm text-white/80 truncate font-medium">
                      {pos.nazwa}
                    </span>
                    <span className="text-[11px] text-white/40 bg-white/[0.05] px-1.5 py-0.5 rounded text-center">
                      {pos.jednostka}
                    </span>
                    <span className="text-[11px] text-blue-400/70 bg-blue-500/[0.08] px-1.5 py-0.5 rounded text-center">
                      R:{pos.skladoweRCount}
                    </span>
                    <span className="text-[11px] text-emerald-400/70 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded text-center">
                      M:{pos.skladoweMCount}
                    </span>
                    <span className="text-center">
                      {isExisting && (
                        <span className="text-[11px] text-amber-400/80 bg-amber-500/[0.1] px-1.5 py-0.5 rounded">
                          Dodano
                        </span>
                      )}
                    </span>
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
              {totalCount} pozycji
              {selected.size > 0 && (
                <span className="ml-2 text-amber-400/90 font-medium">
                  &middot; Wybrano: {selected.size}
                </span>
              )}
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
