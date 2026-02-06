'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ZamowienieRow, generateZamowieniaDraft } from '@/actions/zamowienia';
import { ZamowieniaEmpty } from './zamowienia-empty';
import { ZamowieniaTable } from './zamowienia-table';
import { ZamowienieDetailPanel } from './panels/zamowienie-detail-panel';
import { toast } from 'sonner';

interface ZamowieniaViewProps {
  data: ZamowienieRow[];
  projektId: string;
}

export function ZamowieniaView({ data, projektId }: ZamowieniaViewProps) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateZamowieniaDraft(projektId);
      if (result.success) {
        toast.success('Zamówienia wygenerowane');
        router.refresh();
      } else {
        toast.error(result.error || 'Błąd generowania');
      }
    } finally {
      setLoading(false);
    }
  };

  if (data.length === 0) {
    return <ZamowieniaEmpty onGenerate={handleGenerate} loading={loading} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <ZamowieniaTable data={data} onRowClick={(row) => setDetailId(row.id)} />
      </div>
      <ZamowienieDetailPanel
        zamowienieId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
      />
    </div>
  );
}
