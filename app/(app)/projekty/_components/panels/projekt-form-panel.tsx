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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createProjekt, updateProjekt, type ProjektWithCount } from '@/actions/projekty';

// Form schema (no .default() per zodResolver gotcha)
const projektFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  klient: z.string().max(255, "Max 255 znaków").optional().or(z.literal('')),
  adres: z.string().optional().or(z.literal('')),
  powierzchnia: z.number().positive("Musi być większa od 0").optional().or(z.literal(0)).or(z.literal(undefined)),
  notatki: z.string().optional().or(z.literal('')),
});

type ProjektFormValues = z.infer<typeof projektFormSchema>;

interface ProjektFormPanelProps {
  mode: 'add' | 'edit';
  projekt?: ProjektWithCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjektFormPanel({ mode, projekt, open, onOpenChange }: ProjektFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<ProjektFormValues>({
    resolver: zodResolver(projektFormSchema),
    defaultValues: {
      nazwa: '',
      klient: '',
      adres: '',
      powierzchnia: undefined,
      notatki: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && projekt) {
        form.reset({
          nazwa: projekt.nazwa,
          klient: projekt.klient || '',
          adres: projekt.adres || '',
          powierzchnia: projekt.powierzchnia || undefined,
          notatki: projekt.notatki || '',
        });
      } else {
        form.reset({
          nazwa: '',
          klient: '',
          adres: '',
          powierzchnia: undefined,
          notatki: '',
        });
      }
    }
  }, [open, isEdit, projekt, form]);

  async function onSubmit(data: ProjektFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        nazwa: data.nazwa,
        klient: data.klient || undefined,
        adres: data.adres || undefined,
        powierzchnia: data.powierzchnia || undefined,
        notatki: data.notatki || undefined,
      };

      const result = isEdit && projekt
        ? await updateProjekt(projekt.id, payload)
        : await createProjekt(payload);

      if (result.success) {
        toast.success(isEdit ? 'Zapisano zmiany' : 'Dodano projekt');
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
        <SlidePanelTitle>{isEdit ? 'Edytuj projekt' : 'Nowy projekt'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="projekt-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Nazwa projektu</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. Biuro Acme - Marszałkowska 100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="klient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Klient (opcjonalny)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. Acme Corp"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Adres (opcjonalny)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                      placeholder="ul. Marszałkowska 100, 00-001 Warszawa"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="powierzchnia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Powierzchnia m² (opcjonalna)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. 450"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.valueAsNumber;
                        field.onChange(isNaN(val) ? undefined : val);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notatki"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Notatki (opcjonalne)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
                      placeholder="Dodatkowe informacje..."
                    />
                  </FormControl>
                  <FormMessage />
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
          form="projekt-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
