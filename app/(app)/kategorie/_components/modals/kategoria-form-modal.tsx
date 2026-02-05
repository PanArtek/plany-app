'use client'

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { createKategoriaSchema, type CreateKategoriaInput } from '@/lib/validations/kategorie';
import { createKategoria, updateKategoria, type KategoriaNode } from '@/actions/kategorie';

interface Props {
  mode: 'add' | 'edit';
  poziom: 1 | 2 | 3;
  parentId: string | null;
  parentPath: string | null;
  parentNazwa: string | null;
  suggestedKod: string | null;
  kategoria?: KategoriaNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

const POZIOM_LABELS: Record<number, { title: string; parentLabel: string; kodLabel: string }> = {
  1: { title: 'branżę', parentLabel: '', kodLabel: 'Kod branży' },
  2: { title: 'kategorię', parentLabel: 'Branża nadrzędna', kodLabel: 'Kod kategorii' },
  3: { title: 'podkategorię', parentLabel: 'Kategoria nadrzędna', kodLabel: 'Kod podkategorii' },
};

export function KategoriaFormModal({
  mode,
  poziom,
  parentId,
  parentPath,
  parentNazwa,
  suggestedKod,
  kategoria,
  open,
  onOpenChange,
  isLoading = false,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const labels = POZIOM_LABELS[poziom] || POZIOM_LABELS[2];
  const isEdit = mode === 'edit';

  const form = useForm<CreateKategoriaInput>({
    resolver: zodResolver(createKategoriaSchema),
    defaultValues: {
      parentId: parentId,
      kod: '',
      nazwa: '',
    },
  });

  const kodValue = form.watch('kod');

  const fullKodPreview = useMemo(() => {
    const kod = kodValue || '__';
    return parentPath ? `${parentPath}.${kod}` : kod;
  }, [parentPath, kodValue]);

  useEffect(() => {
    if (open) {
      if (isEdit && kategoria) {
        form.reset({
          parentId: parentId,
          kod: kategoria.kod,
          nazwa: kategoria.nazwa,
        });
      } else if (suggestedKod) {
        form.reset({
          parentId: parentId,
          kod: suggestedKod,
          nazwa: '',
        });
      } else {
        form.reset({
          parentId: parentId,
          kod: '',
          nazwa: '',
        });
      }
    }
  }, [open, isEdit, kategoria, suggestedKod, parentId, form]);

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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {parentPath && parentNazwa && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    {labels.parentLabel}
                  </Label>
                  <Input
                    value={`${parentPath} - ${parentNazwa}`}
                    disabled
                    className="bg-muted font-mono"
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="kod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.kodLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono w-24"
                        maxLength={2}
                        placeholder="01"
                      />
                    </FormControl>
                    {mode === 'add' && suggestedKod && (
                      <FormDescription>
                        Sugestia: {suggestedKod} (następny wolny)
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  Pełny kod (podgląd)
                </Label>
                <Input
                  value={fullKodPreview}
                  disabled
                  className="bg-muted font-mono"
                />
              </div>

              <FormField
                control={form.control}
                name="nazwa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="np. Ściany działowe" />
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
        )}
      </DialogContent>
    </Dialog>
  );
}
