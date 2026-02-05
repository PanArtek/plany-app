'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { type Pozycja } from '@/actions/pozycje';
import { type SkladowaRobocizna, type SkladowaMaterial, deleteSkladowaRobocizna, deleteSkladowaMaterial } from '@/actions/skladowe';
import { obliczCenePozycji } from '@/lib/utils/pozycje';
import { SkladoweSection, type SkladowaItem } from './skladowe-section';
import { SkladowaPanel } from './panels/skladowa-panel';
import { DeleteConfirmPanel } from '../../kategorie/_components/panels/delete-confirm-panel';

type SkladowaType = 'robocizna' | 'material';

interface PozycjaDetailPanelProps {
  pozycja: Pozycja;
  onEdit: () => void;
  onDelete: () => void;
}

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function PozycjaDetailPanel({ pozycja, onEdit, onDelete }: PozycjaDetailPanelProps) {
  const { robocizna, material, cena } = obliczCenePozycji(pozycja);

  // Składowe panel state
  const [panelType, setPanelType] = useState<'robocizna' | 'material' | null>(null);
  const [panelMode, setPanelMode] = useState<'add' | 'edit'>('add');
  const [editingRobocizna, setEditingRobocizna] = useState<SkladowaRobocizna | undefined>();
  const [editingMaterial, setEditingMaterial] = useState<SkladowaMaterial | undefined>();

  // Delete panel state
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [deletingSkladowa, setDeletingSkladowa] = useState<{ id: string; nazwa: string } | null>(null);
  const [deletingSkladowaType, setDeletingSkladowaType] = useState<SkladowaType>('robocizna');

  // Extract branza.kategoria.podkategoria from kod
  const kodParts = pozycja.kod.split('.');
  const breadcrumb = kodParts.slice(0, -1).join('.');

  // Robocizna handlers
  const handleAddRobocizna = () => {
    setPanelType('robocizna');
    setPanelMode('add');
    setEditingRobocizna(undefined);
  };

  const handleEditRobocizna = (item: SkladowaItem) => {
    const skladowa = pozycja.biblioteka_skladowe_robocizna?.find(s => s.id === item.id);
    if (skladowa) {
      setPanelType('robocizna');
      setPanelMode('edit');
      setEditingRobocizna(skladowa as SkladowaRobocizna);
    }
  };

  const handleDeleteRobocizna = (item: SkladowaItem) => {
    setDeletingSkladowa({ id: item.id, nazwa: item.opis || '—' });
    setDeletingSkladowaType('robocizna');
    setDeletePanelOpen(true);
  };

  // Material handlers
  const handleAddMaterial = () => {
    setPanelType('material');
    setPanelMode('add');
    setEditingMaterial(undefined);
  };

  const handleEditMaterial = (item: SkladowaItem) => {
    const skladowa = pozycja.biblioteka_skladowe_materialy?.find(s => s.id === item.id);
    if (skladowa) {
      setPanelType('material');
      setPanelMode('edit');
      setEditingMaterial(skladowa as SkladowaMaterial);
    }
  };

  const handleDeleteMaterial = (item: SkladowaItem) => {
    setDeletingSkladowa({ id: item.id, nazwa: item.nazwa || '—' });
    setDeletingSkladowaType('material');
    setDeletePanelOpen(true);
  };

  const handleConfirmDeleteSkladowa = async () => {
    if (!deletingSkladowa) return;

    const result = deletingSkladowaType === 'robocizna'
      ? await deleteSkladowaRobocizna(deletingSkladowa.id)
      : await deleteSkladowaMaterial(deletingSkladowa.id);

    if (result.success) {
      toast.success(`Usunięto "${deletingSkladowa.nazwa}"`);
      setDeletePanelOpen(false);
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  const typeLabel = deletingSkladowaType === 'robocizna' ? 'składową robocizny' : 'składową materiałową';

  return (
    <>
      {/* Minimalist Dark styled panel */}
      <div className="h-full flex flex-col bg-[#0A0A0F] border-l border-white/[0.08] shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">
        {/* Header: kod in mono amber, nazwa as title */}
        <div className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-amber-500 text-sm">{pozycja.kod}</span>
            <span className="text-white/40 text-sm">{pozycja.jednostka}</span>
          </div>
          <h3 className="text-lg font-semibold text-white tracking-tight">{pozycja.nazwa}</h3>
          {breadcrumb && (
            <p className="text-xs text-white/40 font-mono mt-1">{breadcrumb}</p>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info podstawowe */}
          {pozycja.typ && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-white/50">Typ</h4>
              <p className="text-sm text-white">{pozycja.typ}</p>
            </div>
          )}

          {/* Składowe list */}
          <SkladoweSection
            title="Robocizna"
            items={pozycja.biblioteka_skladowe_robocizna || []}
            suma={robocizna}
            variant="primary"
            editable
            onAdd={handleAddRobocizna}
            onEdit={handleEditRobocizna}
            onDelete={handleDeleteRobocizna}
          />

          <SkladoweSection
            title="Materiały"
            items={pozycja.biblioteka_skladowe_materialy || []}
            suma={material}
            variant="secondary"
            editable
            onAdd={handleAddMaterial}
            onEdit={handleEditMaterial}
            onDelete={handleDeleteMaterial}
          />

          {pozycja.opis && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-white/50">Opis</h4>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{pozycja.opis}</p>
            </div>
          )}
        </div>

        {/* Footer with sticky positioning */}
        <div className="sticky bottom-0 p-6 pt-4 border-t border-white/5 bg-[#0A0A0F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-white/50">Cena jednostkowa NETTO</span>
            <span className="text-xl font-mono font-semibold text-amber-500">{formatCena(cena)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onEdit}
              className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edytuj
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Panels */}
      {panelType === 'robocizna' && (
        <SkladowaPanel
          type="robocizna"
          open={panelType === 'robocizna'}
          onOpenChange={(open) => !open && setPanelType(null)}
          mode={panelMode}
          pozycjaId={pozycja.id}
          skladowa={editingRobocizna}
        />
      )}

      {panelType === 'material' && (
        <SkladowaPanel
          type="material"
          open={panelType === 'material'}
          onOpenChange={(open) => !open && setPanelType(null)}
          mode={panelMode}
          pozycjaId={pozycja.id}
          skladowa={editingMaterial}
        />
      )}

      {deletingSkladowa && (
        <DeleteConfirmPanel
          itemName={deletingSkladowa.nazwa}
          title={`Usuń ${typeLabel}`}
          open={deletePanelOpen}
          onOpenChange={setDeletePanelOpen}
          onConfirm={handleConfirmDeleteSkladowa}
        />
      )}
    </>
  );
}
