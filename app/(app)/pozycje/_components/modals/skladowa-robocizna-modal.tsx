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
  createSkladowaRobociznaSchema,
  jednostkaRobociznaOptions,
  type CreateSkladowaRobociznaInput,
} from '@/lib/validations/skladowe';
import {
  createSkladowaRobocizna,
  updateSkladowaRobocizna,
  type SkladowaRobocizna,
} from '@/actions/skladowe';

interface Props {
  mode: 'add' | 'edit';
  pozycjaId: string;
  skladowa?: SkladowaRobocizna;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkladowaRobociznaModal({ mode, pozycjaId, skladowa, open, onOpenChange }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<CreateSkladowaRobociznaInput>({
    resolver: zodResolver(createSkladowaRobociznaSchema),
    defaultValues: {
      opis: skladowa?.opis || '',
      norma_domyslna: skladowa?.norma_domyslna || 1,
      jednostka: (skladowa?.jednostka as CreateSkladowaRobociznaInput['jednostka']) || 'h',
      stawka_domyslna: skladowa?.stawka_domyslna ?? undefined,
    },
  });

  // Reset form when skladowa changes (edit mode)
  useEffect(() => {
    if (open) {
      if (isEdit && skladowa) {
        form.reset({
          opis: skladowa.opis || '',
          norma_domyslna: skladowa.norma_domyslna || 1,
          jednostka: (skladowa.jednostka as CreateSkladowaRobociznaInput['jednostka']) || 'h',
          stawka_domyslna: skladowa.stawka_domyslna ?? undefined,
        });
      } else {
        form.reset({
          opis: '',
          norma_domyslna: 1,
          jednostka: 'h',
          stawka_domyslna: undefined,
        });
      }
    }
  }, [open, skladowa, form, isEdit]);

  async function onSubmit(data: CreateSkladowaRobociznaInput) {
    setIsSubmitting(true);
    try {
      if (isEdit && skladowa) {
        const result = await updateSkladowaRobocizna(skladowa.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createSkladowaRobocizna(pozycjaId, data);
        if (result.success) {
          toast.success('Dodano składową robocizny');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const dialogTitle = isEdit ? 'Edytuj składową robocizny' : 'Dodaj składową robocizny';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="opis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Opis pracy" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="norma_domyslna"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Norma</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jednostka"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jednostka</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jednostkaRobociznaOptions.map((j) => (
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
            </div>

            <FormField
              control={form.control}
              name="stawka_domyslna"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stawka (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="zł/jednostka"
                      {...field}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : parseFloat(val));
                      }}
                      value={field.value ?? ''}
                    />
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
