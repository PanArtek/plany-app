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
  createSkladowaMaterialSchema,
  jednostkaMaterialOptions,
  type CreateSkladowaMaterialInput,
} from '@/lib/validations/skladowe';
import {
  createSkladowaMaterial,
  updateSkladowaMaterial,
  type SkladowaMaterial,
} from '@/actions/skladowe';

interface Props {
  mode: 'add' | 'edit';
  pozycjaId: string;
  skladowa?: SkladowaMaterial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkladowaMaterialModal({ mode, pozycjaId, skladowa, open, onOpenChange }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<CreateSkladowaMaterialInput>({
    resolver: zodResolver(createSkladowaMaterialSchema),
    defaultValues: {
      nazwa: skladowa?.nazwa || '',
      norma_domyslna: skladowa?.norma_domyslna || 1,
      jednostka: (skladowa?.jednostka as CreateSkladowaMaterialInput['jednostka']) || undefined,
      cena_domyslna: skladowa?.cena_domyslna ?? undefined,
    },
  });

  // Reset form when skladowa changes (edit mode)
  useEffect(() => {
    if (open) {
      if (isEdit && skladowa) {
        form.reset({
          nazwa: skladowa.nazwa || '',
          norma_domyslna: skladowa.norma_domyslna || 1,
          jednostka: (skladowa.jednostka as CreateSkladowaMaterialInput['jednostka']) || undefined,
          cena_domyslna: skladowa.cena_domyslna ?? undefined,
        });
      } else {
        form.reset({
          nazwa: '',
          norma_domyslna: 1,
          jednostka: undefined,
          cena_domyslna: undefined,
        });
      }
    }
  }, [open, skladowa, form, isEdit]);

  async function onSubmit(data: CreateSkladowaMaterialInput) {
    setIsSubmitting(true);
    try {
      if (isEdit && skladowa) {
        const result = await updateSkladowaMaterial(skladowa.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createSkladowaMaterial(pozycjaId, data);
        if (result.success) {
          toast.success('Dodano składową materiałową');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const dialogTitle = isEdit ? 'Edytuj składową materiałową' : 'Dodaj składową materiałową';

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
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nazwa materiału" />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jednostkaMaterialOptions.map((j) => (
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
              name="cena_domyslna"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cena (opcjonalnie)</FormLabel>
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
