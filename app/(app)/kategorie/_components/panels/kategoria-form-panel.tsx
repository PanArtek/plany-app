'use client'

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

const POZIOM_LABELS: Record<number, { title: string; titleNom: string; parentLabel: string; kodLabel: string }> = {
  1: { title: 'branżę', titleNom: 'Branża', parentLabel: '', kodLabel: 'Kod branży' },
  2: { title: 'kategorię', titleNom: 'Kategoria', parentLabel: 'Branża nadrzędna', kodLabel: 'Kod kategorii' },
  3: { title: 'podkategorię', titleNom: 'Podkategoria', parentLabel: 'Kategoria nadrzędna', kodLabel: 'Kod podkategorii' },
};

export function KategoriaFormPanel({
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

  const panelTitle = isEdit
    ? `Edytuj ${labels.title}`
    : `Dodaj ${labels.title}`;

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{panelTitle}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : (
          <Form {...form}>
            <form id="kategoria-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Parent breadcrumb as subtle badge */}
              {parentPath && parentNazwa && (
                <div className="space-y-2">
                  <Label className="text-white/50 text-sm">
                    {labels.parentLabel}
                  </Label>
                  <Badge variant="secondary" className="bg-white/5 text-white/70 font-normal">
                    {parentPath} - {parentNazwa}
                  </Badge>
                </div>
              )}

              {/* Kod field */}
              <FormField
                control={form.control}
                name="kod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{labels.kodLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono w-24 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        maxLength={2}
                        placeholder="01"
                      />
                    </FormControl>
                    {mode === 'add' && suggestedKod && (
                      <FormDescription className="text-white/40">
                        Sugestia: {suggestedKod} (następny wolny)
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Full kod preview with amber highlight */}
              <div className="space-y-2">
                <Label className="text-white/50 text-sm">
                  Pełny kod (podgląd)
                </Label>
                <div className="px-3 py-2 rounded-md bg-white/5 border border-white/10">
                  <span className="font-mono text-amber-500">
                    {fullKodPreview}
                  </span>
                </div>
              </div>

              {/* Nazwa field */}
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
                        placeholder="np. Ściany działowe"
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
          form="kategoria-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
