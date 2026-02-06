'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyRevision, type RewizjaInfo } from '@/actions/kosztorys';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface LockedBannerProps {
  rewizja: RewizjaInfo;
}

export function LockedBanner({ rewizja }: LockedBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    setLoading(true);
    try {
      const result = await copyRevision(rewizja.id);
      if (result.success && result.data) {
        toast.success(`Utworzono nową rewizję R${result.data.numer}`);
        // Navigate to the new revision using the parent route
        const pathParts = window.location.pathname.split('/');
        const projektId = pathParts[pathParts.indexOf('projekty') + 1];
        router.push(`/projekty/${projektId}/kosztorys?rewizja=${result.data.id}`);
      } else {
        toast.error(result.error || 'Błąd kopiowania rewizji');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-6 mt-3 flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <div className="flex items-center gap-2 text-sm text-amber-500">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          Rewizja R{rewizja.numer} jest zamknięta. Edycja zablokowana.
        </span>
      </div>
      <Button
        onClick={handleCopy}
        disabled={loading}
        size="sm"
        variant="outline"
        className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
      >
        {loading ? 'Kopiowanie...' : 'Utwórz nową rewizję'}
      </Button>
    </div>
  );
}
