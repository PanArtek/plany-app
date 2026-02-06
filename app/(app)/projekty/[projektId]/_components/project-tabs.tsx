'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ProjectTabsProps {
  projektId: string;
  status: string;
}

const tabs = [
  { label: 'Kosztorys', segment: 'kosztorys' },
  { label: 'Zamówienia', segment: 'zamowienia' },
  { label: 'Umowy', segment: 'umowy' },
  { label: 'Realizacja', segment: 'realizacja' },
];

export function ProjectTabs({ projektId, status }: ProjectTabsProps) {
  const pathname = usePathname();
  const isEnabled = status === 'realizacja' || status === 'zamkniety';

  return (
    <nav className="flex gap-6 border-b border-white/[0.06] px-6">
      {tabs.map((tab) => {
        const href = `/projekty/${projektId}/${tab.segment}`;
        const isActive = pathname.startsWith(href);
        const isDisabled = tab.segment !== 'kosztorys' && !isEnabled;

        if (isDisabled) {
          return (
            <span
              key={tab.segment}
              className="px-1 py-3 text-sm text-white/20 cursor-not-allowed"
              title="Zaakceptuj rewizję"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              'px-1 py-3 text-sm transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-amber-500 border-amber-500'
                : 'text-white/50 hover:text-white/70 border-transparent'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
