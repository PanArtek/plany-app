'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createKategoriaSchema, type CreateKategoriaInput } from '@/lib/validations/kategorie';
import { createKategoria, updateKategoria, type KategoriaNode } from '@/actions/kategorie';

interface Props {
  mode: 'add' | 'edit';
  poziom: 1 | 2 | 3;
  parentId: string | null;
  kategoria?: KategoriaNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POZIOM_LABELS: Record<number, { title: string; kodHelp: string }> = {
  1: { title: 'branżę', kodHelp: '2-3 wielkie litery (np. BUD)' },
  2: { title: 'kategorię', kodHelp: '2 cyfry (np. 01)' },
  3: { title: 'podkategorię', kodHelp: '2 cyfry (np. 01)' },
};

export function KategoriaFormModal({
  mode,
  poziom,
  parentId,
  kategoria,
  open,
  onOpenChange,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const labels = POZIOM_LABELS[poziom] || POZIOM_LABELS[2];
  const isEdit = mode === 'edit';

  const form = useForm<CreateKategoriaInput>({
    resolver: zodResolver(createKategoriaSchema),
    defaultValues: {
      parentId: parentId,
      kod: kategoria?.kod || '',
      nazwa: kategoria?.nazwa || '',
    },
  });

  // Reset form when parentId changes (tab switch)
  useEffect(() => {
    form.reset({
      parentId: parentId,
      kod: kategoria?.kod || '',
      nazwa: kategoria?.nazwa || '',
    });
  }, [parentId, kategoria, form]);

  async function onSubmit(data: CreateKategoriaInput) {
    setIsSubmitting(true);
    try {
      if (isEdit && kategoria) {
        const result = await updateKategoria(kategoria.id, {
          kod: data.kod,
          nazwa: data.nazwa,
        });
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createKategoria(data);
        if (result.success) {
          toast.success(`Dodano ${labels.title}`);
          onOpenChange(false);
          form.reset();
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const dialogTitle = isEdit
    ? `Edytuj ${labels.title}`
    : `Dodaj ${labels.title}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={labels.kodHelp}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nazwa kategorii" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
