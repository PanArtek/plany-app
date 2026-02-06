'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type UmowaRow, generateUmowyDraft } from '@/actions/umowy';
import { UmowyEmpty } from './umowy-empty';
import { UmowyTable } from './umowy-table';
import { UmowaDetailPanel } from './panels/umowa-detail-panel';
import { toast } from 'sonner';

interface UmowyViewProps {
  data: UmowaRow[];
  projektId: string;
}

export function UmowyView({ data, projektId }: UmowyViewProps) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateUmowyDraft(projektId);
      if (result.success) {
        toast.success('Umowy wygenerowane');
        router.refresh();
      } else {
        toast.error(result.error || 'Błąd generowania');
      }
    } finally {
      setLoading(false);
    }
  };

  if (data.length === 0) {
    return <UmowyEmpty onGenerate={handleGenerate} loading={loading} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <UmowyTable data={data} onRowClick={(row) => setDetailId(row.id)} />
      </div>
      <UmowaDetailPanel
        umowaId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
      />
    </div>
  );
}
