'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { useState, useCallback, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { getKategorieForBranza } from '@/actions/kategorie';

const BRANZE = ['BUD', 'ELE', 'SAN', 'TEL', 'HVC'] as const;

interface PozycjeFiltersProps {
  onAddClick: () => void;
}

export function PozycjeFilters({ onAddClick }: PozycjeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const currentBranza = searchParams.get('branza');
  const currentKategoria = searchParams.get('kategoria');
  const currentPodkategoria = searchParams.get('podkategoria');

  const [kategorieOptions, setKategorieOptions] = useState<{ id: string; kod: string; nazwa: string }[]>([]);
  const [podkategorieOptions, setPodkategorieOptions] = useState<{ id: string; kod: string; nazwa: string }[]>([]);
  const [, startTransition] = useTransition();

  // Fetch kategorie when branza changes
  useEffect(() => {
    if (!currentBranza) {
      setKategorieOptions([]);
      setPodkategorieOptions([]);
      return;
    }

    startTransition(async () => {
      const kategorie = await getKategorieForBranza(currentBranza);
      setKategorieOptions(kategorie);
    });
    setPodkategorieOptions([]);
  }, [currentBranza]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set('search', search);
      } else {
        params.delete('search');
      }
      router.push(`/pozycje?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchParams, router]);

  const handleBranzaClick = useCallback(
    (branza: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (currentBranza === branza) {
        // Toggle off
        params.delete('branza');
      } else {
        // Set new branza, reset kategoria/podkategoria
        params.set('branza', branza);
      }

      // Reset kategoria and podkategoria when branza changes
      params.delete('kategoria');
      params.delete('podkategoria');
      params.delete('selected');

      router.push(`/pozycje?${params.toString()}`);
    },
    [currentBranza, searchParams, router]
  );

  const handleKategoriaChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === '__all__') {
        params.delete('kategoria');
        params.delete('podkategoria');
      } else {
        params.set('kategoria', value);
        params.delete('podkategoria');
      }
      params.delete('selected');
      router.push(`/pozycje?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handlePodkategoriaChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === '__all__') {
        params.delete('podkategoria');
      } else {
        params.set('podkategoria', value);
      }
      params.delete('selected');
      router.push(`/pozycje?${params.toString()}`);
    },
    [searchParams, router]
  );

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="bg-[#1A1A24]/40 backdrop-blur-sm border border-white/[0.08] rounded-lg p-1 inline-flex gap-1">
          {BRANZE.map((b) => {
            const isActive = currentBranza === b;
            return (
              <button
                key={b}
                onClick={() => handleBranzaClick(b)}
                className={cn(
                  "px-4 py-2 font-mono text-sm rounded-md transition-all",
                  isActive
                    ? "bg-amber-500/15 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                {b}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po kodzie lub nazwie..."
              className="pl-8"
            />
          </div>
        </div>

        <Button onClick={onAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj pozycję
        </Button>
      </div>

      {currentBranza && (
        <div className="flex items-center gap-2">
          <Select
            value={currentKategoria ?? '__all__'}
            onValueChange={handleKategoriaChange}
          >
            <SelectTrigger className="w-[260px] bg-[#1A1A24]/40 border-white/[0.08]">
              <SelectValue placeholder="Wszystkie kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie kategorie</SelectItem>
              {kategorieOptions.map((k) => (
                <SelectItem key={k.id} value={k.kod}>
                  {k.kod} - {k.nazwa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentPodkategoria ?? '__all__'}
            onValueChange={handlePodkategoriaChange}
            disabled={!currentKategoria}
          >
            <SelectTrigger
              className={cn(
                "w-[260px] bg-[#1A1A24]/40 border-white/[0.08]",
                !currentKategoria && "opacity-50 pointer-events-none"
              )}
            >
              <SelectValue placeholder="Wszystkie podkategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie podkategorie</SelectItem>
              {podkategorieOptions.map((p) => (
                <SelectItem key={p.id} value={p.kod}>
                  {p.kod} - {p.nazwa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
