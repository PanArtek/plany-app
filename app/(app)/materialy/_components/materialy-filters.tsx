'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useState, useCallback, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { getKategorieForBranza, getKategorieByPoziom } from '@/actions/kategorie';

const BRANZE = [
  { kod: 'BUD', nazwa: 'Budowlana' },
  { kod: 'ELE', nazwa: 'Elektryczna' },
  { kod: 'SAN', nazwa: 'Sanitarna' },
  { kod: 'TEL', nazwa: 'Teletechnika' },
  { kod: 'HVC', nazwa: 'HVAC' },
] as const;

export function MaterialyFilters() {
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

  // Fetch podkategorie when kategoria changes
  useEffect(() => {
    if (!currentKategoria) {
      setPodkategorieOptions([]);
      return;
    }

    const selectedKat = kategorieOptions.find((k) => k.kod === currentKategoria);
    if (!selectedKat) {
      setPodkategorieOptions([]);
      return;
    }

    startTransition(async () => {
      const podkategorie = await getKategorieByPoziom(3, selectedKat.id);
      setPodkategorieOptions(podkategorie);
    });
  }, [currentKategoria, kategorieOptions]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set('search', search);
      } else {
        params.delete('search');
      }
      params.delete('page');
      router.push(`/materialy?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchParams, router]);

  const handleBranzaClick = useCallback(
    (branza: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (currentBranza === branza) {
        params.delete('branza');
      } else {
        params.set('branza', branza);
      }

      params.delete('kategoria');
      params.delete('podkategoria');
      params.delete('page');

      router.push(`/materialy?${params.toString()}`);
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
      params.delete('page');
      router.push(`/materialy?${params.toString()}`);
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
      params.delete('page');
      router.push(`/materialy?${params.toString()}`);
    },
    [searchParams, router]
  );

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="w-full bg-[#1A1A24]/40 backdrop-blur-sm border border-white/[0.08] rounded-lg p-1 flex gap-1">
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('branza');
            params.delete('kategoria');
            params.delete('podkategoria');
            params.delete('page');
            router.push(`/materialy?${params.toString()}`);
          }}
          className={cn(
            "flex-1 px-6 py-2.5 text-sm rounded-md transition-all",
            !currentBranza
              ? "bg-amber-500/15 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "text-white/50 hover:bg-white/5 hover:text-white/80"
          )}
        >
          Wszystkie
        </button>
        {BRANZE.map((b) => {
          const isActive = currentBranza === b.kod;
          return (
            <button
              key={b.kod}
              onClick={() => handleBranzaClick(b.kod)}
              className={cn(
                "flex-1 px-6 py-2.5 text-sm rounded-md transition-all",
                isActive
                  ? "bg-amber-500/15 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              {b.nazwa}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {currentBranza && (
          <>
            <Select
              value={currentKategoria ?? '__all__'}
              onValueChange={handleKategoriaChange}
            >
              <SelectTrigger className="w-[320px] bg-[#1A1A24]/40 border-white/[0.08]">
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
                  "w-[320px] bg-[#1A1A24]/40 border-white/[0.08]",
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
          </>
        )}

        <Select
          value={searchParams.get('statusCenowy') ?? '__all__'}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === '__all__') {
              params.delete('statusCenowy');
            } else {
              params.set('statusCenowy', value);
            }
            params.delete('page');
            router.push(`/materialy?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[200px] bg-[#1A1A24]/40 border-white/[0.08]">
            <SelectValue placeholder="Status cenowy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie</SelectItem>
            <SelectItem value="with_suppliers">Z dostawcami</SelectItem>
            <SelectItem value="without_suppliers">Bez dostawców</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po nazwie lub SKU..."
            className="pl-8"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-white/50 whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={searchParams.get('showInactive') === 'true'}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.checked) {
                params.set('showInactive', 'true');
              } else {
                params.delete('showInactive');
              }
              params.delete('page');
              router.push(`/materialy?${params.toString()}`);
            }}
            className="rounded border-white/20 bg-transparent"
          />
          Nieaktywne
        </label>
      </div>
    </div>
  );
}
