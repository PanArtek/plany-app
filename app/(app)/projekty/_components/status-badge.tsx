import { getStatusConfig } from '@/lib/projekty/status-config';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const c = getStatusConfig(status);

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border', c.className)}>
      {c.label}
    </span>
  );
}
