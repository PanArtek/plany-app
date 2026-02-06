'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type UmowaPozycja, addWykonanie } from '@/actions/umowy';

interface WykonanieFormProps {
  pozycja: UmowaPozycja;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WykonanieForm({ pozycja, onSubmit, onCancel }: WykonanieFormProps) {
  const [loading, setLoading] = useState(false);
  const [dataWpisu, setDataWpisu] = useState(new Date().toISOString().split('T')[0]);
  const remaining = pozycja.ilosc - pozycja.ilosc_wykonana;
  const [iloscWykonana, setIloscWykonana] = useState(remaining > 0 ? remaining : 0);
  const [uwagi, setUwagi] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await addWykonanie(pozycja.id, {
        data_wpisu: dataWpisu,
        ilosc_wykonana: iloscWykonana,
        uwagi: uwagi || undefined,
      });
      if (result.success) {
        onSubmit();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-500/5 border-t border-amber-500/20 px-4 py-3 space-y-3">
      <p className="text-xs text-amber-400 font-medium">
        Dodaj wpis wykonania dla: {pozycja.nazwa}
      </p>
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-white/50 block mb-1">Data wpisu *</label>
          <input
            type="date"
            value={dataWpisu}
            onChange={(e) => setDataWpisu(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm text-white/90"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Ilość (max: {remaining})</label>
          <input
            type="number"
            min={0.01}
            max={remaining}
            step={0.01}
            value={iloscWykonana}
            onChange={(e) => setIloscWykonana(Number(e.target.value))}
            className="w-24 bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm text-white/90"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-white/50 block mb-1">Uwagi</label>
          <input
            type="text"
            value={uwagi}
            onChange={(e) => setUwagi(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm text-white/90"
            placeholder="Opcjonalnie"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>Anuluj</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
          size="sm"
        >
          {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Zapisz
        </Button>
      </div>
    </div>
  );
}
