'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { type Pozycja } from '@/actions/pozycje';
import { type SkladowaRobocizna, type SkladowaMaterial } from '@/actions/skladowe';
import { obliczCenePozycji } from '@/lib/utils/pozycje';
import { SkladoweSection, type SkladowaItem } from './skladowe-section';
import { SkladowaRobociznaModal } from './modals/skladowa-robocizna-modal';
import { SkladowaMaterialModal } from './modals/skladowa-material-modal';
import { DeleteSkladowaDialog, type SkladowaType } from './modals/delete-skladowa-dialog';

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

  // Składowe modal state
  const [modalType, setModalType] = useState<'robocizna' | 'material' | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRobocizna, setEditingRobocizna] = useState<SkladowaRobocizna | undefined>();
  const [editingMaterial, setEditingMaterial] = useState<SkladowaMaterial | undefined>();

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSkladowa, setDeletingSkladowa] = useState<{ id: string; nazwa: string } | null>(null);
  const [deletingSkladowaType, setDeletingSkladowaType] = useState<SkladowaType>('robocizna');

  // Extract branza.kategoria.podkategoria from kod
  const kodParts = pozycja.kod.split('.');
  const breadcrumb = kodParts.slice(0, -1).join('.');

  // Robocizna handlers
  const handleAddRobocizna = () => {
    setModalType('robocizna');
    setModalMode('add');
    setEditingRobocizna(undefined);
  };

  const handleEditRobocizna = (item: SkladowaItem) => {
    const skladowa = pozycja.biblioteka_skladowe_robocizna?.find(s => s.id === item.id);
    if (skladowa) {
      setModalType('robocizna');
      setModalMode('edit');
      setEditingRobocizna(skladowa as SkladowaRobocizna);
    }
  };

  const handleDeleteRobocizna = (item: SkladowaItem) => {
    setDeletingSkladowa({ id: item.id, nazwa: item.opis || '—' });
    setDeletingSkladowaType('robocizna');
    setDeleteDialogOpen(true);
  };

  // Material handlers
  const handleAddMaterial = () => {
    setModalType('material');
    setModalMode('add');
    setEditingMaterial(undefined);
  };

  const handleEditMaterial = (item: SkladowaItem) => {
    const skladowa = pozycja.biblioteka_skladowe_materialy?.find(s => s.id === item.id);
    if (skladowa) {
      setModalType('material');
      setModalMode('edit');
      setEditingMaterial(skladowa as SkladowaMaterial);
    }
  };

  const handleDeleteMaterial = (item: SkladowaItem) => {
    setDeletingSkladowa({ id: item.id, nazwa: item.nazwa || '—' });
    setDeletingSkladowaType('material');
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="h-full flex flex-col border rounded-lg bg-card">
        {/* Header */}
        <div className="p-4 border-b">
          {breadcrumb && (
            <p className="text-xs text-muted-foreground font-mono mb-1">{breadcrumb}</p>
          )}
          <h3 className="text-lg font-medium">{pozycja.nazwa}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{pozycja.kod}</span>
            <span>•</span>
            <span>{pozycja.jednostka}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <SkladoweSection
            title="Robocizna"
            items={pozycja.biblioteka_skladowe_robocizna || []}
            suma={robocizna}
            colorClass="text-blue-600 dark:text-blue-400"
            editable
            onAdd={handleAddRobocizna}
            onEdit={handleEditRobocizna}
            onDelete={handleDeleteRobocizna}
          />

          <SkladoweSection
            title="Materiały"
            items={pozycja.biblioteka_skladowe_materialy || []}
            suma={material}
            colorClass="text-green-600 dark:text-green-400"
            editable
            onAdd={handleAddMaterial}
            onEdit={handleEditMaterial}
            onDelete={handleDeleteMaterial}
          />

          {pozycja.opis && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Opis</h4>
              <p className="text-sm whitespace-pre-wrap">{pozycja.opis}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Cena jednostkowa NETTO</span>
            <span className="text-xl font-mono font-semibold">{formatCena(cena)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onEdit} className="flex-1">
              <Pencil className="h-4 w-4 mr-2" />
              Edytuj
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SkladowaRobociznaModal
        open={modalType === 'robocizna'}
        onOpenChange={(open) => !open && setModalType(null)}
        mode={modalMode}
        pozycjaId={pozycja.id}
        skladowa={editingRobocizna}
      />

      <SkladowaMaterialModal
        open={modalType === 'material'}
        onOpenChange={(open) => !open && setModalType(null)}
        mode={modalMode}
        pozycjaId={pozycja.id}
        skladowa={editingMaterial}
      />

      <DeleteSkladowaDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        skladowa={deletingSkladowa}
        type={deletingSkladowaType}
      />
    </>
  );
}
