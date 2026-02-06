'use client';

import { type KosztorysPozycjaView } from '@/actions/kosztorys';

interface KosztorysSummaryProps {
  pozycje: KosztorysPozycjaView[];
  powierzchnia: number | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' zł';
}

export function KosztorysSummary({ pozycje, powierzchnia }: KosztorysSummaryProps) {
  const wartoscNetto = pozycje.reduce((sum, p) => sum + p.razem, 0);
  const kosztWlasny = pozycje.reduce((sum, p) => sum + p.r_plus_m, 0);
  const zysk = wartoscNetto - kosztWlasny;
  const marza = wartoscNetto > 0 ? (zysk / wartoscNetto) * 100 : 0;
  const cenaMkw = powierzchnia && powierzchnia > 0 ? wartoscNetto / powierzchnia : 0;
  const liczbaPozycji = pozycje.length;

  const kpis = [
    { label: 'Wartość netto', value: formatCurrency(wartoscNetto) },
    { label: 'Marża', value: `${marza.toFixed(1)}%` },
    { label: 'Zysk', value: formatCurrency(zysk) },
    { label: 'Cena/m²', value: formatCurrency(cenaMkw) },
    { label: 'Pozycje', value: String(liczbaPozycji) },
  ];

  return (
    <div className="bg-[#1A1A24]/60 border border-white/[0.08] rounded-xl p-4">
      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="text-xs text-white/50 mb-1">{kpi.label}</div>
            <div className="text-lg font-semibold text-white/90">{kpi.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
