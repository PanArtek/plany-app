export type ProjectStatus = 'draft' | 'ofertowanie' | 'realizacja' | 'zamkniety' | 'odrzucony';

export interface StatusConfig {
  label: string;
  className: string;
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  draft: { label: 'Szkic', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  ofertowanie: { label: 'Ofertowanie', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  realizacja: { label: 'Realizacja', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  zamkniety: { label: 'Zamknięty', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  odrzucony: { label: 'Odrzucony', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export function getStatusConfig(status: string): StatusConfig {
  return PROJECT_STATUS_CONFIG[status as ProjectStatus] || { label: status, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
}
