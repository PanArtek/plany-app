'use client';

import { Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UmowyEmptyProps {
  onGenerate: () => void;
  loading: boolean;
}

export function UmowyEmpty({ onGenerate, loading }: UmowyEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <Briefcase className="h-12 w-12 text-white/20" />
      <h3 className="text-lg font-medium text-white/70">Brak umów</h3>
      <p className="text-sm text-white/40 text-center max-w-sm">
        Wygeneruj umowy z podwykonawcami z zaakceptowanej rewizji
      </p>
      <Button
        onClick={onGenerate}
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Generuj umowy
      </Button>
    </div>
  );
}
