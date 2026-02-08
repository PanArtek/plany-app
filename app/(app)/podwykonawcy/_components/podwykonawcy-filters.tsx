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
import { useState, useEffect } from 'react';

interface PodwykonawcyFiltersProps {
  specjalizacje: string[];
}

export function PodwykonawcyFilters({ specjalizacje }: PodwykonawcyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');

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
      router.push(`/podwykonawcy?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchParams, router]);

  return (
    <div className="flex items-center gap-3 mb-4">
      <Select
        value={searchParams.get('specjalizacja') ?? '__all__'}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          if (value === '__all__') {
            params.delete('specjalizacja');
          } else {
            params.set('specjalizacja', value);
          }
          params.delete('page');
          router.push(`/podwykonawcy?${params.toString()}`);
        }}
      >
        <SelectTrigger className="w-[220px] bg-[#1A1A24]/40 border-white/[0.08]">
          <SelectValue placeholder="Specjalizacja" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Wszystkie</SelectItem>
          {specjalizacje.map((spec) => (
            <SelectItem key={spec} value={spec}>
              {spec}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie lub specjalizacji..."
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
            router.push(`/podwykonawcy?${params.toString()}`);
          }}
          className="rounded border-white/20 bg-transparent"
        />
        Nieaktywne
      </label>
    </div>
  );
}
