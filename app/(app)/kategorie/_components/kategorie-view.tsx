'use client'

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BranzaTabs } from './branza-tabs';
import { KategorieList } from './kategorie-list';
import { KategoriaFormModal } from './modals/kategoria-form-modal';
import { useKategorieUIStore, type BranzaKod } from '@/stores/kategorie-ui-store';
import type { KategoriaNode } from '@/actions/kategorie';
import { Button } from '@/components/ui/button';

interface Props {
  initialData: KategoriaNode[];
}

const BRANZE_NAMES: Record<BranzaKod, string> = {
  BUD: 'Budowlana',
  ELE: 'Elektryczna',
  SAN: 'Sanitarna',
  TEL: 'Teletechnika',
  HVC: 'HVAC',
};

export function KategorieView({ initialData }: Props) {
  const { activeBranza } = useKategorieUIStore();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const currentBranza = initialData.find(b => b.kod === activeBranza);

  return (
    <div>
      <BranzaTabs branzeList={initialData} />

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            {currentBranza?.nazwa || BRANZE_NAMES[activeBranza]}
          </h2>
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj kategorię
          </Button>
        </div>

        <KategorieList
          kategorie={currentBranza?.children || []}
          branzaId={currentBranza?.id}
        />
      </div>

      <KategoriaFormModal
        mode="add"
        poziom={2}
        parentId={currentBranza?.id || null}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />
    </div>
  );
}
