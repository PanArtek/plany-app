'use client';

import { Receipt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WpisyEmptyProps {
  onAddClick: () => void;
}

export function WpisyEmpty({ onAddClick }: WpisyEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Receipt className="h-12 w-12 text-white/10 mb-4" />
      <h3 className="text-lg text-white/60 mb-1">Brak wpisów realizacji</h3>
      <p className="text-sm text-white/30 mb-6">Dodaj pierwszy wpis aby śledzić koszty projektu</p>
      <Button onClick={onAddClick} className="bg-amber-600 hover:bg-amber-500 text-white">
        <Plus className="h-4 w-4 mr-2" />
        Dodaj wpis
      </Button>
    </div>
  );
}
