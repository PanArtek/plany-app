'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Wszystkie statusy' },
  { value: 'draft', label: 'Szkic' },
  { value: 'ofertowanie', label: 'Ofertowanie' },
  { value: 'realizacja', label: 'Realizacja' },
  { value: 'zamkniety', label: 'Zamknięty' },
  { value: 'odrzucony', label: 'Odrzucony' },
];

export function ProjektyFilters() {
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
      router.push(`/projekty?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchParams, router]);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    params.delete('page');
    router.push(`/projekty?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie lub kliencie..."
          className="pl-8"
        />
      </div>
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
