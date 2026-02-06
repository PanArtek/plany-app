'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ZamowieniePozycja, addDostawa } from '@/actions/zamowienia';

interface DostawaFormProps {
  pozycje: ZamowieniePozycja[];
  zamowienieId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function DostawaForm({ pozycje, zamowienieId, onSubmit, onCancel }: DostawaFormProps) {
  const [loading, setLoading] = useState(false);
  const [dataDostawy, setDataDostawy] = useState(new Date().toISOString().split('T')[0]);
  const [numerWz, setNumerWz] = useState('');
  const [uwagi, setUwagi] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of pozycje) {
      const remaining = p.ilosc_zamowiona - p.ilosc_dostarczona;
      init[p.id] = remaining > 0 ? remaining : 0;
    }
    return init;
  });

  const handleSubmit = async () => {
    const filteredPozycje = Object.entries(quantities)
      .filter(([, ilosc]) => ilosc > 0)
      .map(([id, ilosc]) => ({ zamowienie_pozycja_id: id, ilosc }));

    if (filteredPozycje.length === 0) return;

    setLoading(true);
    try {
      const result = await addDostawa(zamowienieId, {
        data_dostawy: dataDostawy,
        numer_wz: numerWz || undefined,
        uwagi: uwagi || undefined,
        pozycje: filteredPozycje,
      });
      if (result.success) {
        onSubmit();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-amber-500/5 border border-amber-500/20 rounded-md p-4 space-y-4">
      <h4 className="text-sm font-medium text-amber-400">Nowa dostawa</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 block mb-1">Data dostawy *</label>
          <input
            type="date"
            value={dataDostawy}
            onChange={(e) => setDataDostawy(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm text-white/90"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Numer WZ</label>
          <input
            type="text"
            value={numerWz}
            onChange={(e) => setNumerWz(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm text-white/90"
            placeholder="Opcjonalnie"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-1">Uwagi</label>
        <textarea
          value={uwagi}
          onChange={(e) => setUwagi(e.target.value)}
          rows={2}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm text-white/90 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-2">Pozycje</label>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs">
              <th className="text-left py-1">Produkt</th>
              <th className="text-right py-1">Zamówione</th>
              <th className="text-right py-1">Dostarczone</th>
              <th className="text-right py-1 w-24">Do przyjęcia</th>
            </tr>
          </thead>
          <tbody>
            {pozycje.map((p) => {
              const remaining = p.ilosc_zamowiona - p.ilosc_dostarczona;
              return (
                <tr key={p.id} className="border-t border-white/[0.06]">
                  <td className="py-1.5 text-white/80">{p.nazwa}</td>
                  <td className="py-1.5 text-right text-white/50">{p.ilosc_zamowiona}</td>
                  <td className="py-1.5 text-right text-white/50">{p.ilosc_dostarczona}</td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      step="any"
                      value={quantities[p.id] || 0}
                      onChange={(e) => setQuantities(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                      className="w-20 bg-white/[0.06] border border-white/[0.1] rounded px-2 py-1 text-sm text-right text-white/90"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Anuluj</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
          size="sm"
        >
          {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Zapisz dostawę
        </Button>
      </div>
    </section>
  );
}
