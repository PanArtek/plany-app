'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createPozycjaSchema,
  jednostkaOptions,
  typOptions,
  type CreatePozycjaInput,
} from '@/lib/validations/pozycje';
import { createPozycja, updatePozycja, type Pozycja } from '@/actions/pozycje';
import { usePozycjaForm } from '@/hooks/use-pozycja-form';

interface Props {
  mode: 'add' | 'edit';
  pozycja?: Pozycja;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYP_LABELS: Record<string, string> = {
  robocizna: 'Robocizna',
  material: 'Materiał',
  komplet: 'Komplet',
};

export function PozycjaFormModal({ mode, pozycja, open, onOpenChange }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { state: categoryState, setBranza, setKategoria, setPodkategoria, reset: resetCategories } = usePozycjaForm();

  const isEdit = mode === 'edit';

  const form = useForm<CreatePozycjaInput>({
    resolver: zodResolver(createPozycjaSchema),
    defaultValues: {
      kod: pozycja?.kod || '',
      nazwa: pozycja?.nazwa || '',
      jednostka: pozycja?.jednostka as CreatePozycjaInput['jednostka'] || 'm²',
      typ: pozycja?.typ || 'komplet',
      kategoriaId: pozycja?.kategoria_id || '',
      opis: pozycja?.opis || '',
    },
  });

  // Reset form when pozycja changes (edit mode)
  useEffect(() => {
    if (isEdit && pozycja) {
      form.reset({
        kod: pozycja.kod || '',
        nazwa: pozycja.nazwa || '',
        jednostka: pozycja.jednostka as CreatePozycjaInput['jednostka'] || 'm²',
        typ: pozycja.typ || 'komplet',
        kategoriaId: pozycja.kategoria_id || '',
        opis: pozycja.opis || '',
      });
    }
  }, [pozycja, form, isEdit]);

  // Reset categories when modal opens for add mode
  useEffect(() => {
    if (open && !isEdit) {
      resetCategories();
      form.reset({
        kod: '',
        nazwa: '',
        jednostka: 'm²',
        typ: 'komplet',
        kategoriaId: '',
        opis: '',
      });
    }
  }, [open, isEdit, resetCategories, form]);

  // Update form fields when category selection changes
  useEffect(() => {
    if (categoryState.suggestedKod) {
      form.setValue('kod', categoryState.suggestedKod);
    }
    if (categoryState.podkategoriaId) {
      form.setValue('kategoriaId', categoryState.podkategoriaId);
    }
  }, [categoryState.suggestedKod, categoryState.podkategoriaId, form]);

  async function onSubmit(data: CreatePozycjaInput) {
    setIsSubmitting(true);
    try {
      if (isEdit && pozycja) {
        const result = await updatePozycja(pozycja.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createPozycja(data);
        if (result.success) {
          toast.success('Dodano pozycję');
          onOpenChange(false);
          form.reset();
          resetCategories();
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const dialogTitle = isEdit ? 'Edytuj pozycję' : 'Dodaj pozycję';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cascading category selects - only in add mode */}
            {!isEdit && (
              <div className="grid grid-cols-3 gap-2">
                <FormItem>
                  <FormLabel>Branża</FormLabel>
                  <Select
                    value={categoryState.branzaId}
                    onValueChange={setBranza}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryState.branze.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.kod} - {b.nazwa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                <FormItem>
                  <FormLabel>Kategoria</FormLabel>
                  <Select
                    value={categoryState.kategoriaId}
                    onValueChange={setKategoria}
                    disabled={!categoryState.branzaId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryState.kategorie.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.kod} - {k.nazwa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                <FormItem>
                  <FormLabel>Podkategoria</FormLabel>
                  <Select
                    value={categoryState.podkategoriaId}
                    onValueChange={setPodkategoria}
                    disabled={!categoryState.kategoriaId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryState.podkategorie.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.kod} - {p.nazwa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              </div>
            )}

            {/* Auto-generated kod - read only */}
            <FormField
              control={form.control}
              name="kod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={categoryState.isLoadingKod ? 'Generowanie...' : 'Wybierz podkategorię'}
                      className="font-mono"
                      disabled={!isEdit}
                      readOnly={!isEdit}
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
                    <Input {...field} placeholder="Nazwa pozycji" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jednostka"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jednostka</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz jednostkę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jednostkaOptions.map((j) => (
                          <SelectItem key={j} value={j}>
                            {j}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="typ"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typOptions.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYP_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                type="submit"
                disabled={isSubmitting || (!isEdit && !categoryState.suggestedKod)}
              >
                {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
