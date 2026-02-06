export type ZamowienieStatus = 'draft' | 'wyslane' | 'czesciowo' | 'dostarczone' | 'rozliczone';

export interface StatusConfig {
  label: string;
  className: string;
}

export const ZAMOWIENIE_STATUS_CONFIG: Record<ZamowienieStatus, StatusConfig> = {
  draft: { label: 'Szkic', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  wyslane: { label: 'Wysłane', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  czesciowo: { label: 'Częściowo dostarczone', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  dostarczone: { label: 'Dostarczone', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rozliczone: { label: 'Rozliczone', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

export function getZamowienieStatusConfig(status: string): StatusConfig {
  return ZAMOWIENIE_STATUS_CONFIG[status as ZamowienieStatus] || { label: status, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
}
