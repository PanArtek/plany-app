export type UmowaStatus = 'draft' | 'wyslana' | 'podpisana' | 'wykonana' | 'rozliczona';

export interface StatusConfig {
  label: string;
  className: string;
}

export const UMOWA_STATUS_CONFIG: Record<UmowaStatus, StatusConfig> = {
  draft: { label: 'Szkic', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  wyslana: { label: 'Wysłana', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  podpisana: { label: 'Podpisana', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  wykonana: { label: 'Wykonana', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rozliczona: { label: 'Rozliczona', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

export function getUmowaStatusConfig(status: string): StatusConfig {
  return UMOWA_STATUS_CONFIG[status as UmowaStatus] || { label: status, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
}
