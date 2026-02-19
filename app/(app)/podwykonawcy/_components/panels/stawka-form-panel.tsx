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
import { createStawka, updateStawka, type StawkaEntry } from '@/actions/podwykonawcy';
import { getAllTypyRobocizny } from '@/actions/typy-robocizny';

const stawkaFormSchema = z.object({
  typRobociznyId: z.string().uuid("Wybierz typ robocizny"),
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
  const [typyRobocizny, setTypyRobocizny] = useState<{ id: string; nazwa: string; jednostka: string | null }[]>([]);
  const [loadingTypy, setLoadingTypy] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<StawkaFormValues>({
    resolver: zodResolver(stawkaFormSchema),
    defaultValues: {
      typRobociznyId: '',
      stawka: 0,
    },
  });

  const selectedTypId = form.watch('typRobociznyId');
  const selectedTyp = typyRobocizny.find((t) => t.id === selectedTypId);

  // Fetch typy robocizny for dropdown
  useEffect(() => {
    if (open) {
      setLoadingTypy(true);
      getAllTypyRobocizny().then((data) => {
        setTypyRobocizny(data);
        setLoadingTypy(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEdit && stawka) {
        form.reset({
          typRobociznyId: stawka.typRobociznyId,
          stawka: stawka.stawka,
        });
      } else {
        form.reset({
          typRobociznyId: '',
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
          typRobociznyId: data.typRobociznyId,
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
        {loadingTypy ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : (
          <Form {...form}>
            <form id="stawka-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="typRobociznyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Typ robocizny</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Wybierz typ robocizny..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typyRobocizny.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nazwa}
                            {t.jednostka && <span className="text-white/40 ml-1">({t.jednostka})</span>}
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
                      Stawka (zł{selectedTyp?.jednostka ? `/${selectedTyp.jednostka}` : ''})
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
          disabled={isSubmitting || loadingTypy}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
