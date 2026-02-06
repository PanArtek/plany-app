'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { bulkUpdateNarzut, deleteKosztorysPozycje } from '@/actions/kosztorys';

interface BulkToolbarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onDelete: () => void;
}

export function BulkToolbar({
  selectedIds,
  onClearSelection,
  onDelete,
}: BulkToolbarProps) {
  const [narzutValue, setNarzutValue] = useState(30);
  const [narzutOpen, setNarzutOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (selectedIds.size === 0) return null;

  const handleApplyNarzut = async () => {
    setApplying(true);
    const result = await bulkUpdateNarzut(Array.from(selectedIds), narzutValue);
    setApplying(false);
    if (result.success) {
      toast.success(`Zaktualizowano narzut na ${selectedIds.size} pozycjach`);
      setNarzutOpen(false);
      onClearSelection();
    } else {
      toast.error(result.error || 'Błąd aktualizacji');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteKosztorysPozycje(Array.from(selectedIds));
    setDeleting(false);
    if (result.success) {
      toast.success(`Usunięto ${selectedIds.size} pozycji`);
      onClearSelection();
      onDelete();
    } else {
      toast.error(result.error || 'Błąd usuwania');
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg">
      <span className="text-sm text-white/60">
        Zaznaczono {selectedIds.size} pozycji
      </span>
      <div className="flex items-center gap-2">
        <Popover open={narzutOpen} onOpenChange={setNarzutOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-white/70 border-white/[0.1] hover:bg-white/[0.04]"
            >
              Ustaw narzut %
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-3" align="end">
            <div className="space-y-2">
              <label className="text-xs text-white/50">Narzut %</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={narzutValue}
                onChange={(e) => setNarzutValue(Number(e.target.value))}
                className="h-8 bg-white/[0.03] border-white/[0.08] text-sm"
              />
              <Button
                onClick={handleApplyNarzut}
                disabled={applying}
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                Zastosuj
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {deleting ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usuń pozycje</AlertDialogTitle>
              <AlertDialogDescription>
                Czy na pewno chcesz usunąć {selectedIds.size} pozycji? Ta operacja jest nieodwracalna.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
