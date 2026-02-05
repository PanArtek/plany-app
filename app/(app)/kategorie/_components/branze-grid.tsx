import type { BranzaKod } from '@/stores/kategorie-ui-store';
import { BranzaTile } from './branza-tile';

const BRANZE: { kod: BranzaKod; nazwa: string }[] = [
  { kod: 'BUD', nazwa: 'Budowlana' },
  { kod: 'ELE', nazwa: 'Elektryczna' },
  { kod: 'SAN', nazwa: 'Sanitarna' },
  { kod: 'TEL', nazwa: 'Teletechnika' },
  { kod: 'HVC', nazwa: 'HVAC' },
];

interface Props {
  counts: Record<BranzaKod, number>;
}

export function BranzeGrid({ counts }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {BRANZE.map(({ kod, nazwa }) => (
        <BranzaTile
          key={kod}
          kod={kod}
          nazwa={nazwa}
          count={counts[kod]}
        />
      ))}
    </div>
  );
}
