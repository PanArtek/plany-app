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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createDostawca, updateDostawca, type DostawcaWithCount } from '@/actions/dostawcy';

// Form schema (all fields explicit for zodResolver compatibility)
const dostawcaFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  kod: z.string().max(50, "Max 50 znaków").optional().or(z.literal('')),
  kontakt: z.string().optional().or(z.literal('')),
  aktywny: z.boolean(),
});

type DostawcaFormValues = z.infer<typeof dostawcaFormSchema>;

interface DostawcaFormPanelProps {
  mode: 'add' | 'edit';
  dostawca?: DostawcaWithCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DostawcaFormPanel({ mode, dostawca, open, onOpenChange }: DostawcaFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<DostawcaFormValues>({
    resolver: zodResolver(dostawcaFormSchema),
    defaultValues: {
      nazwa: '',
      kod: '',
      kontakt: '',
      aktywny: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && dostawca) {
        form.reset({
          nazwa: dostawca.nazwa,
          kod: dostawca.kod || '',
          kontakt: dostawca.kontakt || '',
          aktywny: dostawca.aktywny,
        });
      } else {
        form.reset({
          nazwa: '',
          kod: '',
          kontakt: '',
          aktywny: true,
        });
      }
    }
  }, [open, isEdit, dostawca, form]);

  async function onSubmit(data: DostawcaFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        nazwa: data.nazwa,
        kod: data.kod || undefined,
        kontakt: data.kontakt || undefined,
        aktywny: data.aktywny,
      };

      const result = isEdit && dostawca
        ? await updateDostawca(dostawca.id, payload)
        : await createDostawca(payload);

      if (result.success) {
        toast.success(isEdit ? 'Zapisano zmiany' : 'Dodano dostawcę');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Błąd zapisu');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{isEdit ? 'Edytuj dostawcę' : 'Dodaj dostawcę'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="dostawca-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Nazwa</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. Hurtownia Atlas"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Kod (opcjonalny)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. ATL"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kontakt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Kontakt</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
                      placeholder="Telefon, email, adres..."
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
          form="dostawca-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
