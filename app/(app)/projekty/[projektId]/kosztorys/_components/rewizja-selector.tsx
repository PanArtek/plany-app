'use client';

import { useRouter } from 'next/navigation';
import { Lock, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type RewizjaInfo } from '@/actions/kosztorys';

interface RewizjaSelectorProps {
  rewizje: RewizjaInfo[];
  activeRewizjaId: string;
  projektId: string;
}

export function RewizjaSelector({ rewizje, activeRewizjaId, projektId }: RewizjaSelectorProps) {
  const router = useRouter();

  return (
    <Select
      value={activeRewizjaId}
      onValueChange={(value) => {
        router.push(`/projekty/${projektId}/kosztorys?rewizja=${value}`);
      }}
    >
      <SelectTrigger className="w-[140px] h-8 bg-white/[0.03] border-white/[0.08] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rewizje.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            <span className="flex items-center gap-1.5">
              R{r.numer}
              {r.is_locked && <Lock className="h-3 w-3 text-white/40" />}
              {r.is_accepted && <Check className="h-3 w-3 text-emerald-400" />}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
