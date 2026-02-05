'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
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

export function PozycjaFormPanel({ mode, pozycja, open, onOpenChange }: Props) {
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

  // Reset categories when panel opens for add mode
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

  const panelTitle = isEdit ? 'Edytuj pozycję' : 'Dodaj pozycję';

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{panelTitle}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="pozycja-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Cascading category selects - only in add mode - single row */}
            {!isEdit && (
              <div className="grid grid-cols-3 gap-3">
                <FormItem>
                  <FormLabel className="text-white/80">Branża</FormLabel>
                  <Select
                    value={categoryState.branzaId}
                    onValueChange={setBranza}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
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
                  <FormLabel className="text-white/80">Kategoria</FormLabel>
                  <Select
                    value={categoryState.kategoriaId}
                    onValueChange={setKategoria}
                    disabled={!categoryState.branzaId}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
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
                  <FormLabel className="text-white/80">Podkategoria</FormLabel>
                  <Select
                    value={categoryState.podkategoriaId}
                    onValueChange={setPodkategoria}
                    disabled={!categoryState.kategoriaId}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
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

            {/* Auto-generated kod with amber glow when ready */}
            <FormField
              control={form.control}
              name="kod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Kod</FormLabel>
                  <FormControl>
                    <div className={`px-3 py-2 rounded-md border ${
                      field.value && !isEdit
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                        : 'bg-white/5 border-white/10'
                    }`}>
                      <span className={`font-mono ${field.value ? 'text-amber-500' : 'text-white/40'}`}>
                        {field.value || (categoryState.isLoadingKod ? 'Generowanie...' : 'Wybierz podkategorię')}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nazwa */}
            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Nazwa</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nazwa pozycji"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Jednostka + Typ side by side */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jednostka"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Jednostka</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
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
                    <FormLabel className="text-white/80">Typ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
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

            {/* Opis field - more space in wide panel */}
            <FormField
              control={form.control}
              name="opis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Opcjonalny opis pozycji..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
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
          form="pozycja-form"
          disabled={isSubmitting || (!isEdit && !categoryState.suggestedKod)}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
