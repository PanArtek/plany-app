'use client'

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteKategoria } from '@/actions/kategorie';

interface Props {
  kategoria: { id: string; kod: string; nazwa: string } | null;
  hasChildren: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteConfirmModal({
  kategoria,
  hasChildren,
  open,
  onOpenChange,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!kategoria) return;

    setIsDeleting(true);
    try {
      const result = await deleteKategoria(kategoria.id);
      if (result.success) {
        toast.success(`Usunięto "${kategoria.nazwa}"`);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Błąd usuwania');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (!kategoria) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuń kategorię</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć kategorię{' '}
            <span className="font-mono font-medium">{kategoria.kod}</span> -{' '}
            <span className="font-medium">{kategoria.nazwa}</span>?
          </DialogDescription>
        </DialogHeader>

        {hasChildren && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            Ta kategoria ma podkategorie. Usuń najpierw podkategorie.
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || hasChildren}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
