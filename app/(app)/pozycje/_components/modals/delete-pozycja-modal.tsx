'use client';

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
import { deletePozycja } from '@/actions/pozycje';

interface Props {
  pozycja: { id: string; kod: string; nazwa: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeletePozycjaModal({
  pozycja,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!pozycja) return;

    setIsDeleting(true);
    try {
      const result = await deletePozycja(pozycja.id);
      if (result.success) {
        toast.success(`Usunięto "${pozycja.nazwa}"`);
        onOpenChange(false);
        onDeleted();
      } else {
        toast.error(result.error || 'Błąd usuwania');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (!pozycja) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuń pozycję</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć pozycję{' '}
            <span className="font-mono font-medium">{pozycja.kod}</span> -{' '}
            <span className="font-medium">{pozycja.nazwa}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
          Ta operacja jest nieodwracalna. Jeśli pozycja jest używana w kosztorysach,
          usunięcie zostanie zablokowane.
        </div>

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
            disabled={isDeleting}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
