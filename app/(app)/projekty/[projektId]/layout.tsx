import { redirect } from 'next/navigation';
import { getProjekt } from '@/actions/projekty';
import { StatusBadge } from '@/app/(app)/projekty/_components/status-badge';
import { ProjectTabs } from './_components/project-tabs';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface LayoutProps {
  params: Promise<{ projektId: string }>;
  children: React.ReactNode;
}

export default async function ProjectLayout({ params, children }: LayoutProps) {
  const { projektId } = await params;
  const projekt = await getProjekt(projektId);

  if (!projekt) {
    redirect('/projekty');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/projekty" className="text-white/50 hover:text-white/80 transition-colors">
            Projekty
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-white/30" />
          <span className="text-white/90 font-medium">{projekt.nazwa}</span>
          <StatusBadge status={projekt.status} />
        </div>
      </div>

      {/* Tab bar */}
      <ProjectTabs projektId={projektId} status={projekt.status} />

      {/* Page content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
