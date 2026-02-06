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
import { createPodwykonawca, updatePodwykonawca, type PodwykonawcaWithCount } from '@/actions/podwykonawcy';

const podwykonawcaFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional().or(z.literal('')),
  kontakt: z.string().optional().or(z.literal('')),
  aktywny: z.boolean(),
});

type PodwykonawcaFormValues = z.infer<typeof podwykonawcaFormSchema>;

interface PodwykonawcaFormPanelProps {
  mode: 'add' | 'edit';
  podwykonawca?: PodwykonawcaWithCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PodwykonawcaFormPanel({ mode, podwykonawca, open, onOpenChange }: PodwykonawcaFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<PodwykonawcaFormValues>({
    resolver: zodResolver(podwykonawcaFormSchema),
    defaultValues: {
      nazwa: '',
      specjalizacja: '',
      kontakt: '',
      aktywny: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && podwykonawca) {
        form.reset({
          nazwa: podwykonawca.nazwa,
          specjalizacja: podwykonawca.specjalizacja || '',
          kontakt: podwykonawca.kontakt || '',
          aktywny: podwykonawca.aktywny,
        });
      } else {
        form.reset({
          nazwa: '',
          specjalizacja: '',
          kontakt: '',
          aktywny: true,
        });
      }
    }
  }, [open, isEdit, podwykonawca, form]);

  async function onSubmit(data: PodwykonawcaFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        nazwa: data.nazwa,
        specjalizacja: data.specjalizacja || undefined,
        kontakt: data.kontakt || undefined,
        aktywny: data.aktywny,
      };

      const result = isEdit && podwykonawca
        ? await updatePodwykonawca(podwykonawca.id, payload)
        : await createPodwykonawca(payload);

      if (result.success) {
        toast.success(isEdit ? 'Zapisano zmiany' : 'Dodano podwykonawcę');
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
        <SlidePanelTitle>{isEdit ? 'Edytuj podwykonawcę' : 'Dodaj podwykonawcę'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="podwykonawca-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      placeholder="np. Ekipa GK Budmont"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specjalizacja"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Specjalizacja (opcjonalna)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. GK, Tynki, Sufity"
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
          form="podwykonawca-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
