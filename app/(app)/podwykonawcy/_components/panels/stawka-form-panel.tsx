'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { getAllPozycjeBiblioteka } from '@/actions/podwykonawcy';
import { createStawka, updateStawka, type StawkaEntry } from '@/actions/podwykonawcy';

const stawkaFormSchema = z.object({
  pozycjaBibliotekaId: z.string().uuid("Wybierz pozycję"),
  stawka: z.number().positive("Stawka musi być większa od 0"),
});

type StawkaFormValues = z.infer<typeof stawkaFormSchema>;

interface StawkaFormPanelProps {
  mode: 'add' | 'edit';
  podwykonawcaId: string | null;
  stawka?: StawkaEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StawkaFormPanel({ mode, podwykonawcaId, stawka, open, onOpenChange }: StawkaFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pozycje, setPozycje] = useState<{ id: string; kod: string; nazwa: string; jednostka: string }[]>([]);
  const [loadingPozycje, setLoadingPozycje] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<StawkaFormValues>({
    resolver: zodResolver(stawkaFormSchema),
    defaultValues: {
      pozycjaBibliotekaId: '',
      stawka: 0,
    },
  });

  const selectedPozycjaId = form.watch('pozycjaBibliotekaId');
  const selectedPozycja = pozycje.find((p) => p.id === selectedPozycjaId);

  // Fetch pozycje for dropdown
  useEffect(() => {
    if (open) {
      setLoadingPozycje(true);
      getAllPozycjeBiblioteka().then((data) => {
        setPozycje(data);
        setLoadingPozycje(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEdit && stawka) {
        form.reset({
          pozycjaBibliotekaId: stawka.pozycjaBibliotekaId,
          stawka: stawka.stawka,
        });
      } else {
        form.reset({
          pozycjaBibliotekaId: '',
          stawka: 0,
        });
      }
    }
  }, [open, isEdit, stawka, form]);

  async function onSubmit(data: StawkaFormValues) {
    if (!podwykonawcaId) return;

    setIsSubmitting(true);
    try {
      if (isEdit && stawka) {
        const result = await updateStawka(stawka.id, {
          stawka: data.stawka,
        });
        if (result.success) {
          toast.success('Zapisano zmianę stawki');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createStawka({
          podwykonawcaId,
          pozycjaBibliotekaId: data.pozycjaBibliotekaId,
          stawka: data.stawka,
        });
        if (result.success) {
          toast.success('Dodano pozycję do cennika');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{isEdit ? 'Edytuj stawkę' : 'Dodaj pozycję do cennika'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        {loadingPozycje ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : (
          <Form {...form}>
            <form id="stawka-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="pozycjaBibliotekaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Pozycja</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Wybierz pozycję..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pozycje.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-amber-500 mr-2">{p.kod}</span>
                            {p.nazwa}
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
                name="stawka"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      Stawka (zł{selectedPozycja ? `/${selectedPozycja.jednostka}` : ''})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="font-mono bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}
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
          form="stawka-form"
          disabled={isSubmitting || loadingPozycje}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
