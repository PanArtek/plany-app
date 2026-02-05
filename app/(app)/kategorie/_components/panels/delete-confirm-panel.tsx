'use client'

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import { Button } from '@/components/ui/button';

interface DeleteConfirmPanelProps {
  /** Item name to display in confirmation message */
  itemName: string;
  /** Optional item code for display */
  itemKod?: string;
  /** Panel title (default: "Potwierdź usunięcie") */
  title?: string;
  /** Warning message about consequences (e.g., "Usunie też X pozycji") */
  warningMessage?: string;
  /** If true, deletion is blocked */
  isBlocked?: boolean;
  /** Message explaining why deletion is blocked */
  blockReason?: string;
  /** Panel open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when delete is confirmed */
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmPanel({
  itemName,
  itemKod,
  title = 'Potwierdź usunięcie',
  warningMessage,
  isBlocked = false,
  blockReason,
  open,
  onOpenChange,
  onConfirm,
}: DeleteConfirmPanelProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="narrow">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <SlidePanelTitle>{title}</SlidePanelTitle>
        </div>
      </SlidePanelHeader>

      <SlidePanelContent>
        <div className="space-y-4">
          {/* Confirmation question */}
          <p className="text-white/80">
            Czy na pewno chcesz usunąć{' '}
            {itemKod && (
              <>
                <span className="font-mono text-amber-500">{itemKod}</span>
                {' - '}
              </>
            )}
            <span className="font-medium text-white">{itemName}</span>?
          </p>

          {/* Warning about consequences */}
          {warningMessage && !isBlocked && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400">
                {warningMessage}
              </p>
            </div>
          )}

          {/* Block reason (if deletion is blocked) */}
          {isBlocked && blockReason && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                {blockReason}
              </p>
            </div>
          )}
        </div>
      </SlidePanelContent>

      <SlidePanelFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="text-white/60 hover:text-white hover:bg-white/5"
        >
          Anuluj
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isBlocked}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isDeleting ? 'Usuwanie...' : 'Usuń'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
