'use client';

import { type Pozycja } from '@/actions/pozycje';
import { type PozycjeFilters } from '@/lib/validations/pozycje';

interface PozycjeViewProps {
  initialData: Pozycja[];
  initialFilters: PozycjeFilters;
  initialSelected: string | null;
}

export function PozycjeView({ initialData, initialFilters, initialSelected }: PozycjeViewProps) {
  // Placeholder - will be fully implemented in POZ-010
  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        Filters: {JSON.stringify(initialFilters)}
      </div>
      <div className="text-sm text-muted-foreground">
        Selected: {initialSelected || 'none'}
      </div>
      <div className="text-sm text-muted-foreground">
        Loaded {initialData.length} pozycje
      </div>
    </div>
  );
}
