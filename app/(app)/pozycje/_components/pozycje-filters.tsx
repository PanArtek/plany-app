'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

const BRANZE = ['BUD', 'ELE', 'SAN', 'TEL', 'HVC'] as const;

interface PozycjeFiltersProps {
  onAddClick: () => void;
}

export function PozycjeFilters({ onAddClick }: PozycjeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const currentBranza = searchParams.get('branza');

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

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        {BRANZE.map((b) => (
          <Button
            key={b}
            variant={currentBranza === b ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleBranzaClick(b)}
            className="font-mono"
          >
            {b}
          </Button>
        ))}
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
  );
}
