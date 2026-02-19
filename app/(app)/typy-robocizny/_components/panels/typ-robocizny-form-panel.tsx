'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  createTypRobocizny,
  updateTypRobocizny,
  type TypRobocizny,
} from '@/actions/typy-robocizny';
import { typRobociznyFormSchema, jednostkaOptions } from '@/lib/validations/typy-robocizny';

type FormValues = z.infer<typeof typRobociznyFormSchema>;

interface TypRobociznyFormPanelProps {
  mode: 'add' | 'edit';
  typ?: TypRobocizny;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyDefaults: FormValues = {
  nazwa: '',
  jednostka: 'm2',
  opis: '',
  aktywny: true,
};

const JEDNOSTKA_LABELS: Record<string, string> = {
  m2: 'm² — metr kwadratowy',
  mb: 'mb — metr bieżący',
  szt: 'szt — sztuka',
  kpl: 'kpl — komplet',
  h: 'h — godzina',
};

export function TypRobociznyFormPanel({ mode, typ, open, onOpenChange }: TypRobociznyFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<FormValues>({
    resolver: zodResolver(typRobociznyFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) {
      if (isEdit && typ) {
        form.reset({
          nazwa: typ.nazwa,
          jednostka: (typ.jednostka as FormValues['jednostka']) || 'm2',
          opis: typ.opis || '',
          aktywny: typ.aktywny ?? true,
        });
      } else {
        form.reset(emptyDefaults);
      }
    }
  }, [open, isEdit, typ, form]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        nazwa: data.nazwa,
        jednostka: data.jednostka,
        opis: data.opis || null,
        aktywny: data.aktywny,
      };

      const result = isEdit && typ
        ? await updateTypRobocizny(typ.id, payload)
        : await createTypRobocizny(payload);

      if (result.success) {
        toast.success(isEdit ? 'Zapisano zmiany' : 'Dodano typ robocizny');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Błąd zapisu');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/30";
  const labelClass = "text-white/80";

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{isEdit ? 'Edytuj typ robocizny' : 'Dodaj typ robocizny'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="typ-robocizny-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Nazwa *</FormLabel>
                  <FormControl>
                    <Input {...field} className={inputClass} placeholder="np. Montaż ścianek g-k" />
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
                  <FormLabel className={labelClass}>Jednostka *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Wybierz jednostkę" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jednostkaOptions.map((j) => (
                        <SelectItem key={j} value={j}>
                          {JEDNOSTKA_LABELS[j] || j}
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
              name="opis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      className={`${inputClass} min-h-[80px]`}
                      placeholder="Opcjonalny opis typu robocizny..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aktywny"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-white/80 !mt-0">Aktywny</FormLabel>
                </FormItem>
              )}
            />
          </form>
        </Form>
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
          type="submit"
          form="typ-robocizny-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
