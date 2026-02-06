'use client';

import { Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZamowieniaEmptyProps {
  onGenerate: () => void;
  loading: boolean;
}

export function ZamowieniaEmpty({ onGenerate, loading }: ZamowieniaEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <Package className="h-12 w-12 text-white/20" />
      <h3 className="text-lg font-medium text-white/70">Brak zamówień</h3>
      <p className="text-sm text-white/40 text-center max-w-sm">
        Wygeneruj zamówienia materiałowe z zaakceptowanej rewizji
      </p>
      <Button
        onClick={onGenerate}
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Generuj zamówienia
      </Button>
    </div>
  );
}
