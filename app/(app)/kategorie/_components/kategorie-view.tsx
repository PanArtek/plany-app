'use client'

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BranzaTabs } from './branza-tabs';
import { KategorieList } from './kategorie-list';
import { KategoriaFormPanel } from './panels/kategoria-form-panel';
import type { BranzaKod } from '@/stores/kategorie-ui-store';
import { useKategoriaModal } from '@/hooks/use-kategoria-modal';
import type { KategoriaNode } from '@/actions/kategorie';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  initialData: KategoriaNode[];
  activeBranza: BranzaKod;
}

const BRANZE_NAMES: Record<BranzaKod, string> = {
  BUD: 'Budowlana',
  ELE: 'Elektryczna',
  SAN: 'Sanitarna',
  TEL: 'Teletechnika',
  HVC: 'HVAC',
};

export function KategorieView({ initialData, activeBranza }: Props) {
  const modal = useKategoriaModal();
  const [selectedKategoriaId, setSelectedKategoriaId] = useState<string>('all');

  const currentBranza = initialData.find(b => b.kod === activeBranza);
  const kategorie = currentBranza?.children || [];

  const handleAddKategoria = () => {
    if (currentBranza) {
      modal.openAdd(
        currentBranza.id,
        currentBranza.kod,
        currentBranza.nazwa,
        2
      );
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap">
        <BranzaTabs branzeList={initialData} activeBranza={activeBranza} />

        <Select value={selectedKategoriaId} onValueChange={setSelectedKategoriaId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Wszystkie kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {kategorie.map((kat) => (
              <SelectItem key={kat.id} value={kat.id}>
                {kat.nazwa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            {currentBranza?.nazwa || BRANZE_NAMES[activeBranza]}
          </h2>
          <Button size="sm" onClick={handleAddKategoria}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj kategorię
          </Button>
        </div>

        <KategorieList
          kategorie={currentBranza?.children || []}
          branzaKod={currentBranza?.kod || activeBranza}
          branzaNazwa={currentBranza?.nazwa || BRANZE_NAMES[activeBranza]}
          onAddPodkategoria={(parentId, parentKod, parentNazwa) =>
            modal.openAdd(parentId, parentKod, parentNazwa, 3)
          }
          onEditKategoria={(kategoria, parentKod, parentNazwa) =>
            modal.openEdit(kategoria, parentKod, parentNazwa, 2)
          }
          onEditPodkategoria={(kategoria, parentKod, parentNazwa) =>
            modal.openEdit(kategoria, parentKod, parentNazwa, 3)
          }
        />
      </div>

      <KategoriaFormPanel
        mode={modal.state.mode}
        poziom={modal.state.poziom}
        parentId={modal.state.parentId}
        parentPath={modal.state.parentPath}
        parentNazwa={modal.state.parentNazwa}
        suggestedKod={modal.state.suggestedKod}
        kategoria={modal.state.kategoria}
        open={modal.state.open}
        onOpenChange={modal.setOpen}
        isLoading={modal.state.isLoading}
      />
    </div>
  );
}
