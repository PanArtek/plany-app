'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { deleteSkladowaRobocizna, deleteSkladowaMaterial } from '@/actions/skladowe';

export type SkladowaType = 'robocizna' | 'material';

interface DeleteSkladowaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skladowa: { id: string; nazwa: string } | null;
  type: SkladowaType;
}

export function DeleteSkladowaDialog({
  open,
  onOpenChange,
  skladowa,
  type,
}: DeleteSkladowaDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!skladowa) return;

    setIsDeleting(true);
    try {
      const result = type === 'robocizna'
        ? await deleteSkladowaRobocizna(skladowa.id)
        : await deleteSkladowaMaterial(skladowa.id);

      if (result.success) {
        toast.success(`Usunięto "${skladowa.nazwa}"`);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Błąd usuwania');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (!skladowa) return null;

  const typeLabel = type === 'robocizna' ? 'składową robocizny' : 'składową materiałową';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń {typeLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz usunąć{' '}
            <span className="font-medium">{skladowa.nazwa}</span>?
            Ta operacja jest nieodwracalna.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
