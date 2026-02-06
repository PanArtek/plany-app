export type RealizacjaWpisTyp = 'material' | 'robocizna' | 'inny';

export interface TypConfig {
  label: string;
  className: string;
}

export const WPIS_TYP_CONFIG: Record<RealizacjaWpisTyp, TypConfig> = {
  material: { label: 'Materiał', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  robocizna: { label: 'Robocizna', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  inny: { label: 'Inny', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

export function getWpisTypConfig(typ: string): TypConfig {
  return WPIS_TYP_CONFIG[typ as RealizacjaWpisTyp] || { label: typ, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
}
